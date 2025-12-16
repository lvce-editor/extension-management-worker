import { state } from '../ExtensionMetaState/ExtensionMetaState.ts'
import * as GetJson from '../GetJson/GetJson.ts'
import * as WebExtensionsUrl from '../WebExtensionsUrl/WebExtensionsUrl.ts'

export const getDynamicWebExtensions = async (assetDir: string) => {
  return state.webExtensions
}
