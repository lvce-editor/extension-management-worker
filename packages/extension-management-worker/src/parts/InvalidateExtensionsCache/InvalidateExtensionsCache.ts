import { RendererWorker } from '@lvce-editor/rpc-registry'

export const invalidateExtensionsCache = async () => {
  try {
    await RendererWorker.invoke('ExtensionManagement.handleExtensionsCacheInvalidated')
  } catch {
    // Older renderer workers do not expose the cache invalidation notification.
  }
}
