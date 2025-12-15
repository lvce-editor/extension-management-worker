import * as CacheEnabled from '../CacheEnabled/CacheEnabled.ts'
import * as DoGetExtensions from '../DoGetExtensions/DoGetExtensions.ts'
import * as GetExtensionsFromCache from '../GetExtensionsFromCache/GetExtensionsFromCache.ts'
import * as SaveExtensionsInCache from '../SaveExtensionsInCache/SaveExtensionsInCache.ts'

const getExtensionsCacheFirst = async () => {
  const cached = await GetExtensionsFromCache.getExtensionsFromCache()
  if (cached) {
    return cached
  }
  const items = await DoGetExtensions.doGetExtensions()
  await SaveExtensionsInCache.saveExtensionsInCache(items)
  return items
}

export const getExtensions = async () => {
  if (CacheEnabled.cacheEnabled) {
    return getExtensionsCacheFirst()
  }
  return DoGetExtensions.doGetExtensions()
}
