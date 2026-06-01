import { TransferMessagePortRpcParent, type Rpc } from '@lvce-editor/rpc'
import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'
import * as RendererWorker from '../Rpc/Rpc.ts'

export const getOrCreateIsolatedExtensionHostWorker = async (extensionId: string, absolutePath: string): Promise<Rpc> => {
  const existingRpc = IsolatedExtensionHostWorkerState.get(extensionId)
  if (existingRpc) {
    return existingRpc
  }
  const rpc = await TransferMessagePortRpcParent.create({
    commandMap: CommandMapRef.commandMapRef,
    isMessagePortOpen: false,
    send(port: MessagePort) {
      return RendererWorker.invokeAndTransfer('LaunchIsolatedExtensionHostWorker.launchIsolatedExtensionHostWorker', port, extensionId, absolutePath)
    },
  })
  IsolatedExtensionHostWorkerState.set(extensionId, rpc)
  return rpc
}
