const webViews = Object.create(null)
const webViewProviders = Object.create(null)

export const getProvider = (providerId: string): any => {
  return webViewProviders[providerId]
}

export const setProvider = (providerId: string, provider: any): void => {
  webViewProviders[providerId] = provider
}

export const getWebView = (id: string): any => {
  return webViews[id]
}

export const setWebView = (id: string, webView: any): void => {
  webViews[id] = webView
}

export const getWebViews = () => {
  return webViews
}
