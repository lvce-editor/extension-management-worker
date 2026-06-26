const webViews = Object.create(null)

export const getWebView = (id: string): any => {
  return webViews[id]
}
