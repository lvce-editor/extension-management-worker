import { type Rpc, LazyTransferMessagePortRpcParent } from '@lvce-editor/rpc'
import { RendererWorker } from '@lvce-editor/rpc-registry'

export const initializeIframeWorker = async (): Promise<Rpc> => {
  const rpc = await LazyTransferMessagePortRpcParent.create({
    commandMap: {},
    async send(port) {
      await RendererWorker.sendMessagePortToIconThemeWorker(port, 0)
    },
  })
  return rpc
}
