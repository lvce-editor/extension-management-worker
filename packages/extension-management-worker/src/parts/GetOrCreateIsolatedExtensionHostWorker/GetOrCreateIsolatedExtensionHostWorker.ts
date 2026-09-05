/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import { TransferMessagePortRpcParent, type Rpc } from '@lvce-editor/rpc'
import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'
import {
  createExtensionCommandExecutor,
  createExtensionCommandMap,
  type ExtensionCommand,
  type ExtensionCommandMap,
} from '../CreateExtensionCommandMap/CreateExtensionCommandMap.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import * as FileChangeHandlerRegistry from '../FileChangeHandlerRegistry/FileChangeHandlerRegistry.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'
import * as RendererWorker from '../Rpc/Rpc.ts'

interface RpcWithIpc extends Rpc {
  readonly ipc?: {
    execute?: ExtensionCommand
  }
}

type CreateRpc = (options: {
  readonly commandMap: ExtensionCommandMap
  readonly isMessagePortOpen: boolean
  readonly send: (port: MessagePort) => Promise<void>
}) => Promise<RpcWithIpc>

type InvokeAndTransfer = typeof RendererWorker.invokeAndTransfer

type CreateWorker = (
  extensionId: string,
  absolutePath: string,
  workerName: string,
  contentSecurityPolicy: string,
  application?: ExtensionsState.ExtensionsState,
) => Promise<Rpc>

const pendingRpcs: Record<string, Promise<Rpc> | undefined> = Object.create(null)

export const getPendingExtensionIds = (application: ExtensionsState.ExtensionsState): readonly string[] => {
  return Object.keys(pendingRpcs).flatMap((key) => {
    const [applicationId, generation, extensionId] = JSON.parse(key)
    return applicationId === application.applicationId && generation === application.applicationGeneration ? [extensionId] : []
  })
}

export const getRuntimeId = (extensionId: string, application?: ExtensionsState.ExtensionsState): string => {
  return application?.applicationId === undefined
    ? extensionId
    : JSON.stringify([application.applicationId, application.applicationGeneration, extensionId])
}

const bindCommandMap = (rpc: RpcWithIpc, commandMap: ExtensionCommandMap): Rpc => {
  if (rpc.ipc) {
    rpc.ipc.execute = createExtensionCommandExecutor(commandMap)
  }
  return rpc
}

export const createIsolatedExtensionHostWorker = async (
  extensionId: string,
  absolutePath: string,
  workerName: string,
  contentSecurityPolicy: string,
  createRpc: CreateRpc,
  invokeAndTransfer: InvokeAndTransfer,
  application?: ExtensionsState.ExtensionsState,
): Promise<Rpc> => {
  const runtimeId = getRuntimeId(extensionId, application)
  const invokeCommand =
    application === undefined
      ? undefined
      : (method: string, ...args: readonly any[]) => {
          ExtensionsState.assertCurrentApplication(application)
          if (method === 'Extensions.registerFileChangeHandler') {
            return FileChangeHandlerRegistry.register(extensionId, application.applicationId)
          }
          if (method === 'Extensions.unregisterFileChangeHandler') {
            return FileChangeHandlerRegistry.unregister(extensionId, application.applicationId)
          }
          const invokeApplication = (CommandMapRef.commandMapRef as ExtensionCommandMap)['Extensions.invokeForApplication']
          if (!invokeApplication) {
            throw new Error('Application extension command routing is not initialized')
          }
          return invokeApplication(application.applicationId, method, ...args)
        }
  const commandMap = createExtensionCommandMap(runtimeId, invokeCommand)
  const rpc = await createRpc({
    commandMap,
    isMessagePortOpen: true,
    send(port: MessagePort) {
      return invokeAndTransfer(
        'LaunchIsolatedExtensionHostWorker.launchIsolatedExtensionHostWorker',
        port,
        runtimeId,
        absolutePath,
        workerName,
        contentSecurityPolicy,
      )
    },
  })
  return bindCommandMap(rpc, commandMap)
}

const createWorker: CreateWorker = (extensionId, absolutePath, workerName, contentSecurityPolicy, application) => {
  return createIsolatedExtensionHostWorker(
    extensionId,
    absolutePath,
    workerName,
    contentSecurityPolicy,
    TransferMessagePortRpcParent.create,
    RendererWorker.invokeAndTransfer,
    application,
  )
}

const createAndStoreRpc = async (
  extensionId: string,
  absolutePath: string,
  workerName: string,
  contentSecurityPolicy: string,
  create: CreateWorker,
  application?: ExtensionsState.ExtensionsState,
): Promise<Rpc> => {
  try {
    const rpc =
      application === undefined
        ? await create(extensionId, absolutePath, workerName, contentSecurityPolicy)
        : await create(extensionId, absolutePath, workerName, contentSecurityPolicy, application)
    if (application !== undefined) {
      try {
        ExtensionsState.assertCurrentApplication(application)
      } catch (error) {
        await Promise.allSettled([
          rpc.dispose(),
          RendererWorker.invoke('LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker', getRuntimeId(extensionId, application)),
        ])
        throw error
      }
    }
    IsolatedExtensionHostWorkerState.set(extensionId, rpc, application?.applicationId)
    return rpc
  } catch (error) {
    console.error(`[extension-management-worker] ${extensionId} failed to activate`, error)
    throw error
  }
}

export const getOrCreateIsolatedExtensionHostWorker = async (
  extensionId: string,
  absolutePath: string,
  workerName = '',
  contentSecurityPolicy = '',
  create: CreateWorker = createWorker,
  applicationId?: string,
): Promise<Rpc> => {
  const application = applicationId === undefined ? undefined : ExtensionsState.get(applicationId)
  const existingRpc = IsolatedExtensionHostWorkerState.get(extensionId, applicationId)
  if (existingRpc) {
    return existingRpc
  }
  const key = JSON.stringify([applicationId ?? null, application?.applicationGeneration ?? null, extensionId])
  const pendingRpc = pendingRpcs[key]
  if (pendingRpc !== undefined) {
    return pendingRpc
  }
  const newRpc = createAndStoreRpc(extensionId, absolutePath, workerName, contentSecurityPolicy, create, application)
  pendingRpcs[key] = newRpc
  try {
    return await newRpc
  } finally {
    if (pendingRpcs[key] === newRpc) {
      delete pendingRpcs[key]
    }
  }
}
