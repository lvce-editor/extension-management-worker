import { RendererWorker } from '@lvce-editor/rpc-registry'

export const invalidateExtensionsCache = async (extensionId?: string, disabled?: boolean) => {
  try {
    if (extensionId) {
      await RendererWorker.invoke('ExtensionManagement.handleExtensionsCacheInvalidated', extensionId, disabled)
      return
    }
    await RendererWorker.invoke('ExtensionManagement.handleExtensionsCacheInvalidated')
  } catch {
    // Older renderer workers do not expose the cache invalidation notification.
  }
}
