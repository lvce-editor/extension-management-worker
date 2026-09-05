import { RendererWorker } from '@lvce-editor/rpc-registry'

export const notifyRunningExtensionsChanged = (applicationId?: string): void => {
  setTimeout(() => {
    const notification =
      applicationId === undefined
        ? RendererWorker.invoke('Layout.handleExtensionsChanged')
        : RendererWorker.invoke('Application.execute', applicationId, 'Layout.handleExtensionsChanged')
    void Promise.resolve(notification).catch(() => {})
  }, 0)
}
