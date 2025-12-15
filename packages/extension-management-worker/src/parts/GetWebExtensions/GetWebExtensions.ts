import * as GetJson from '../GetJson/GetJson.ts'
import * as WebExtensionsUrl from '../WebExtensionsUrl/WebExtensionsUrl.ts'

export const getWebExtensions = async (assetDir: string) => {
  return GetJson.getJson(WebExtensionsUrl.getWebExtensionsUrl(assetDir))
}
