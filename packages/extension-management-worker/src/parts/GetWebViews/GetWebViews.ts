import * as GetExtensions from '../GetExtensions/GetExtensions.ts'
import * as GetWebViewsFromExtensions from '../GetWebViewsFromExtensions/GetWebViewsFromExtensions.ts'

export const getWebViews = async (assetDir: string) => {
  const extensions = await GetExtensions.getAllExtensions(assetDir)
  const webViews = GetWebViewsFromExtensions.getWebViewsFromExtensions(extensions)
  return webViews
}
