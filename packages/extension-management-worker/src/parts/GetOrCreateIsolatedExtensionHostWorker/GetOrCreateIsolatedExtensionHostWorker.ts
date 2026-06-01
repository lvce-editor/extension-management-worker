import { MessagePortRpcParent, type Rpc } from '@lvce-editor/rpc'
import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'
import * as GetPortTuple from '../GetPortTuple/GetPortTuple.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'
import * as RendererWorker from '../Rpc/Rpc.ts'

export const getOrCreateIsolatedExtensionHostWorker = async (extensionId: string): Promise<Rpc> => {
  const existingRpc = IsolatedExtensionHostWorkerState.get(extensionId)
  if (existingRpc) {
    return existingRpc
  }
  const { port1, port2 } = GetPortTuple.getPortTuple()
  const rpcPromise = MessagePortRpcParent.create({
    commandMap: CommandMapRef.commandMapRef,
    isMessagePortOpen: true,
    messagePort: port2,
  })
  port2.start()
  await RendererWorker.invokeAndTransfer('LaunchIsolatedExtensionHostWorker.launchIsolatedExtensionHostWorker', port1, extensionId)
  const rpc = await rpcPromise
  IsolatedExtensionHostWorkerState.set(extensionId, rpc)
  return rpc
}
