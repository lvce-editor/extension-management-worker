import * as GetExtensions from '../GetExtensions/GetExtensions.ts'
import * as GetWebViewsFromExtensions from '../GetWebViewsFromExtensions/GetWebViewsFromExtensions.ts'

export const getWebViews = async (assetDir: string, platform: number) => {
  const extensions = await GetExtensions.getAllExtensions(assetDir, platform)
  const webViews = GetWebViewsFromExtensions.getWebViewsFromExtensions(extensions)
  return webViews
}
