import { RendererWorker } from '@lvce-editor/rpc-registry'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'

export const invalidateExtensionsCache = async (extensionId?: string, disabled?: boolean) => {
  ExtensionsState.clearAllCachedExtensions()
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

export const deferInvalidateExtensionsCache = (extensionId?: string, disabled?: boolean): void => {
  setTimeout(() => {
    void invalidateExtensionsCache(extensionId, disabled)
  }, 0)
}
