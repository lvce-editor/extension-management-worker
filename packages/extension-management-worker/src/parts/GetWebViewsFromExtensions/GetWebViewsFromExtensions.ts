import * as GetRemoteUrl from '../GetRemoteUrl/GetRemoteUrl.ts'

export const getWebViewsFromExtensions = (extensions: readonly any[]): readonly any[] => {
  const webViews: any[] = []
  for (const extension of extensions) {
    if (extension && extension.webViews) {
      for (const webView of extension.webViews) {
        let { path } = extension
        if (webView && webView.path) {
          path = `${extension.path}/${webView.path}`
        }
        const uri = path
        const remotePath = GetRemoteUrl.getRemoteUrl(uri)
        webViews.push({
          ...webView,
          path,
          remotePath,
          uri,
        })
      }
    }
  }
  return webViews
}
