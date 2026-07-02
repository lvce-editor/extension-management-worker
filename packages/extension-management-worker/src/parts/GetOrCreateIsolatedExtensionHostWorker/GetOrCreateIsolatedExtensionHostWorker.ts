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

export const getOrCreateIsolatedExtensionHostWorker = async (
  extensionId: string,
  absolutePath: string,
  workerName = '',
): Promise<Rpc> => {
  const existingRpc = IsolatedExtensionHostWorkerState.get(extensionId)
  if (existingRpc) {
    return existingRpc
  }
  const rpc = await createIsolatedExtensionHostWorker(
    extensionId,
    absolutePath,
    workerName,
    TransferMessagePortRpcParent.create,
    RendererWorker.invokeAndTransfer,
  )
  IsolatedExtensionHostWorkerState.set(extensionId, rpc)
  return rpc
}
