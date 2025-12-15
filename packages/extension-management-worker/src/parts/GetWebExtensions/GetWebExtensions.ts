import * as GetJson from '../GetJson/GetJson.ts'
import * as WebExtensionsUrl from '../WebExtensionsUrl/WebExtensionsUrl.ts'

export const getWebExtensions = async () => {
  return GetJson.getJson(WebExtensionsUrl.extensionsUrl)
}
