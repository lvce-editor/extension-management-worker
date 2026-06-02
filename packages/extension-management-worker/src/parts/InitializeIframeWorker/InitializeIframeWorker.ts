import { type Rpc, LazyTransferMessagePortRpcParent } from '@lvce-editor/rpc'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import * as IframeWorkerState from '../IframeWorkerState/IframeWorkerState.ts'

export const initializeIframeWorker = async (): Promise<Rpc> => {
  const rpc = await LazyTransferMessagePortRpcParent.create({
    commandMap: {},
    async send(port) {
      await RendererWorker.sendMessagePortToIconThemeWorker(port, 0)
    },
  })
  IframeWorkerState.set(rpc)
  return rpc
}
