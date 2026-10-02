import { LazyTransferMessagePortRpcParent } from '@lvce-editor/rpc'
import { CacheWorker, RendererWorker } from '@lvce-editor/rpc-registry'
import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'

export const initializeCacheWorker = async (): Promise<void> => {
  const rpc = await LazyTransferMessagePortRpcParent.create({
    commandMap: CommandMapRef.commandMapRef,
    async send(port) {
      await RendererWorker.invokeAndTransfer('SendMessagePortToExtensionHostWorker.sendMessagePortToCacheWorker', port)
    },
  })
  CacheWorker.set(rpc)
}
