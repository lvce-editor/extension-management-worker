import * as CacheStorage from '../CacheStorage/CacheStorage.ts'
import * as ExtensionsCacheKey from '../ExtensionsCacheKey/ExtensionsCacheKey.ts'

export const saveExtensionsInCache = async (data: any): Promise<void> => {
  return CacheStorage.setJson(ExtensionsCacheKey.extensionsCacheKey, data)
}
