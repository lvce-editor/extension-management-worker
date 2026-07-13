import { LazyTransferMessagePortRpcParent } from '@lvce-editor/rpc'
import { ErrorWorker, RendererWorker } from '@lvce-editor/rpc-registry'
import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'

export const initializeErrorWorker = async (): Promise<void> => {
  const rpc = await LazyTransferMessagePortRpcParent.create({
    commandMap: CommandMapRef.commandMapRef,
    async send(port): Promise<void> {
      await RendererWorker.sendMessagePortToErrorWorker(port, 0)
    },
  })
  ErrorWorker.set(rpc)
}
