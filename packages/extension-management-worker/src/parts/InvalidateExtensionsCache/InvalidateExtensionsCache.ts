import { RendererWorker } from '@lvce-editor/rpc-registry'

export const invalidateExtensionsCache = async (disabledExtensionId?: string) => {
  try {
    if (disabledExtensionId) {
      await RendererWorker.invoke('ExtensionManagement.handleExtensionsCacheInvalidated', disabledExtensionId)
      return
    }
    await RendererWorker.invoke('ExtensionManagement.handleExtensionsCacheInvalidated')
  } catch {
    // Older renderer workers do not expose the cache invalidation notification.
  }
}
