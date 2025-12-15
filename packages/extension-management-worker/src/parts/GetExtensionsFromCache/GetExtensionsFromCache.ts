import * as CacheStorage from '../CacheStorage/CacheStorage.ts'
import * as ExtensionsCacheKey from '../ExtensionsCacheKey/ExtensionsCacheKey.ts'

export const getExtensionsFromCache = async (): Promise<any> => {
  return CacheStorage.getJson(ExtensionsCacheKey.extensionsCacheKey)
}
