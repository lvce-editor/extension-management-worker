import { RendererWorker } from '@lvce-editor/rpc-registry'

export const notifyRunningExtensionsChanged = (): void => {
  setTimeout(() => {
    void RendererWorker.invoke('Layout.handleExtensionsChanged')
  }, 0)
}
