import { invalidateExtensionsCache } from '../InvalidateExtensionsCache/InvalidateExtensionsCache.ts'

export const uninstallExtension = async () => {
  // TODO
  await invalidateExtensionsCache()
}
