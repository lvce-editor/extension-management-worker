import * as CacheStorage from '../CacheStorage/CacheStorage.ts'
import * as GetColorThemeJsonCacheKey from '../GetColorThemeJsonCacheKey/GetColorThemeJsonCacheKey.ts'

const cacheName = 'ColorThemes'

export const getColorThemeJsonCached = async (source: string, validator: string, getJson: () => Promise<any>, forceReload = false): Promise<any> => {
  const cacheKey = GetColorThemeJsonCacheKey.getColorThemeJsonCacheKey(source)
  if (!forceReload) {
    try {
      const cached = await CacheStorage.getJson(cacheKey, cacheName)
      if (cached?.validator === validator) {
        return cached.json
      }
    } catch {
      // Persistent cache errors must not prevent loading the theme.
    }
  }
  const json = await getJson()
  try {
    await CacheStorage.setJson(cacheKey, { json, validator }, cacheName)
  } catch {
    // Persistent cache errors must not prevent loading the theme.
  }
  return json
}
