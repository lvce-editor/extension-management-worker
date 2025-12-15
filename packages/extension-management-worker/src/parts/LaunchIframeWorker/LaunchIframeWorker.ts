import { type Rpc, TransferMessagePortRpcParent } from '@lvce-editor/rpc'
import { RendererWorker } from '@lvce-editor/rpc-registry'

export const launchIframeWorker = async (): Promise<Rpc> => {
  const rpc = await TransferMessagePortRpcParent.create({
    commandMap: {},
    async send(port) {
      await RendererWorker.sendMessagePortToIconThemeWorker(port, 0)
    },
  })
  return rpc
}
