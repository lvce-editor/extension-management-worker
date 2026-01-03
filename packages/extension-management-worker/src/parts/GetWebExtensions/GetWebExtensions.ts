import * as GetJson from '../GetJson/GetJson.ts'
import * as WebExtensionsUrl from '../WebExtensionsUrl/WebExtensionsUrl.ts'

export const getWebExtensions = async (assetDir: string) => {
  try {
    return await GetJson.getJson(WebExtensionsUrl.getWebExtensionsUrl(assetDir))
  } catch {
    return []
  }
}
