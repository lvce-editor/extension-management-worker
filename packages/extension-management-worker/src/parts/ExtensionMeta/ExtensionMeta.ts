import * as CacheEnabled from '../CacheEnabled/CacheEnabled.ts'
import * as DoGetExtensions from '../DoGetExtensions/DoGetExtensions.ts'
import * as ExtensionManifestStatus from '../ExtensionManifestStatus/ExtensionManifestStatus.js'
import * as GetExtensionsFromCache from '../GetExtensionsFromCache/GetExtensionsFromCache.ts'
import * as SaveExtensionsInCache from '../SaveExtensionsInCache/SaveExtensionsInCache.ts'

const getExtensionsCacheFirst = async (assetDir: string, platform: number) => {
  const cached = await GetExtensionsFromCache.getExtensionsFromCache()
  if (cached) {
    return cached
  }
  const items = await DoGetExtensions.doGetExtensions(assetDir, platform)
  await SaveExtensionsInCache.saveExtensionsInCache(items)
  return items
}

export const getExtensions = async (assetDir: string, platform: number) => {
  if (CacheEnabled.cacheEnabled) {
    return getExtensionsCacheFirst(assetDir, platform)
  }
  return DoGetExtensions.doGetExtensions(assetDir, platform)
}

// TODO status fulfilled should be handled as resolved
export const organizeExtensions = (extensions: readonly any[]): any => {
  const rejected = []
  const resolved = []
  for (const extension of extensions) {
    switch (extension.status) {
      case ExtensionManifestStatus.Rejected:
        rejected.push(extension)
        break
      case ExtensionManifestStatus.Resolved:
        resolved.push(extension)
        break
      default:
        resolved.push(extension)
        break
    }
  }
  return {
    rejected,
    resolved,
  }
}
