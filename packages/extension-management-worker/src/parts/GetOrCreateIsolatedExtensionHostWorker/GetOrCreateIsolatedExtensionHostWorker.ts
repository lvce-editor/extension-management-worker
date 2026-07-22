/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import { TransferMessagePortRpcParent, type Rpc } from '@lvce-editor/rpc'
import {
  createExtensionCommandExecutor,
  createExtensionCommandMap,
  type ExtensionCommand,
  type ExtensionCommandMap,
} from '../CreateExtensionCommandMap/CreateExtensionCommandMap.ts'
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

type CreateWorker = (extensionId: string, absolutePath: string, workerName: string, contentSecurityPolicy: string) => Promise<Rpc>

const pendingRpcs: Record<string, Promise<Rpc> | undefined> = Object.create(null)

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
): Promise<Rpc> => {
  const commandMap = createExtensionCommandMap(extensionId)
  const rpc = await createRpc({
    commandMap,
    isMessagePortOpen: true,
    send(port: MessagePort) {
      return invokeAndTransfer(
        'LaunchIsolatedExtensionHostWorker.launchIsolatedExtensionHostWorker',
        port,
        extensionId,
        absolutePath,
        workerName,
        contentSecurityPolicy,
      )
    },
  })
  return bindCommandMap(rpc, commandMap)
}

const createWorker = (extensionId: string, absolutePath: string, workerName: string, contentSecurityPolicy: string): Promise<Rpc> => {
  return createIsolatedExtensionHostWorker(
    extensionId,
    absolutePath,
    workerName,
    contentSecurityPolicy,
    TransferMessagePortRpcParent.create,
    RendererWorker.invokeAndTransfer,
  )
}

const createAndStoreRpc = async (
  extensionId: string,
  absolutePath: string,
  workerName: string,
  contentSecurityPolicy: string,
  create: CreateWorker,
): Promise<Rpc> => {
  const rpc = await create(extensionId, absolutePath, workerName, contentSecurityPolicy)
  IsolatedExtensionHostWorkerState.set(extensionId, rpc)
  return rpc
}

export const getOrCreateIsolatedExtensionHostWorker = async (
  extensionId: string,
  absolutePath: string,
  workerName = '',
  contentSecurityPolicy = '',
  create: CreateWorker = createWorker,
): Promise<Rpc> => {
  const existingRpc = IsolatedExtensionHostWorkerState.get(extensionId)
  if (existingRpc) {
    return existingRpc
  }
  const pendingRpc = pendingRpcs[extensionId]
  if (pendingRpc !== undefined) {
    return pendingRpc
  }
  const newRpc = createAndStoreRpc(extensionId, absolutePath, workerName, contentSecurityPolicy, create)
  pendingRpcs[extensionId] = newRpc
  try {
    return await newRpc
  } finally {
    delete pendingRpcs[extensionId]
  }
}
