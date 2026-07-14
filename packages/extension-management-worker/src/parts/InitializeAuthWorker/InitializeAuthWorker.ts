import { LazyTransferMessagePortRpcParent } from '@lvce-editor/rpc'
import { AuthWorker, RendererWorker } from '@lvce-editor/rpc-registry'
import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'

export const initializeAuthWorker = async (): Promise<void> => {
  const rpc = await LazyTransferMessagePortRpcParent.create({
    commandMap: CommandMapRef.commandMapRef,
    async send(port) {
      await RendererWorker.sendMessagePortToAuthWorker(port, 0)
    },
  })
  AuthWorker.set(rpc)
}
