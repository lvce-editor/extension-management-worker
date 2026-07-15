import { TransferMessagePortRpcParent, type Rpc } from '@lvce-editor/rpc'
import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'
import * as RendererWorker from '../Rpc/Rpc.ts'

type CreateRpc = (options: {
  readonly commandMap: any
  readonly isMessagePortOpen: boolean
  readonly send: (port: MessagePort) => Promise<void>
}) => Promise<Rpc>

type InvokeAndTransfer = typeof RendererWorker.invokeAndTransfer

type CreateWorker = (extensionId: string, absolutePath: string, workerName: string) => Promise<Rpc>

const pendingRpcs: Record<string, Promise<Rpc> | undefined> = Object.create(null)

export const createIsolatedExtensionHostWorker = async (
  extensionId: string,
  absolutePath: string,
  workerName: string,
  createRpc: CreateRpc,
  invokeAndTransfer: InvokeAndTransfer,
): Promise<Rpc> => {
  return createRpc({
    commandMap: CommandMapRef.commandMapRef,
    isMessagePortOpen: true,
    send(port: MessagePort) {
      return invokeAndTransfer('LaunchIsolatedExtensionHostWorker.launchIsolatedExtensionHostWorker', port, extensionId, absolutePath, workerName)
    },
  })
}

const createWorker = (extensionId: string, absolutePath: string, workerName: string): Promise<Rpc> => {
  return createIsolatedExtensionHostWorker(
    extensionId,
    absolutePath,
    workerName,
    TransferMessagePortRpcParent.create,
    RendererWorker.invokeAndTransfer,
  )
}

const createAndStoreRpc = async (extensionId: string, absolutePath: string, workerName: string, create: CreateWorker): Promise<Rpc> => {
  const rpc = await create(extensionId, absolutePath, workerName)
  IsolatedExtensionHostWorkerState.set(extensionId, rpc)
  return rpc
}

export const getOrCreateIsolatedExtensionHostWorker = async (
  extensionId: string,
  absolutePath: string,
  workerName = '',
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
  const newRpc = createAndStoreRpc(extensionId, absolutePath, workerName, create)
  pendingRpcs[extensionId] = newRpc
  try {
    return await newRpc
  } finally {
    delete pendingRpcs[extensionId]
  }
}
