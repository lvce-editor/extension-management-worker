export const getRemoteUrl = (uri: string): string => {
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri
  }
  if (uri.startsWith('/')) {
    return `/remote${uri}`
  }
  return `/remote/${uri}`
}
