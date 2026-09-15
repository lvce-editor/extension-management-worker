/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import * as GetJson from '../GetJson/GetJson.ts'
import * as WebExtensionsUrl from '../WebExtensionsUrl/WebExtensionsUrl.ts'

export const getWebExtensions = async (assetDir: string, cache: Map<string, Promise<readonly any[]>>) => {
  const url = WebExtensionsUrl.getWebExtensionsUrl(assetDir)
  const cached = cache.get(url)
  if (cached) {
    try {
      return await cached
    } catch {
      if (cache.get(url) === cached) {
        cache.delete(url)
      }
      return []
    }
  }
  const promise = GetJson.getJson(url)
  cache.set(url, promise)
  try {
    return await promise
  } catch {
    if (cache.get(url) === promise) {
      cache.delete(url)
    }
    return []
  }
}
