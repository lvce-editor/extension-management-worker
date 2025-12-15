export const getRemoteUrl = (uri: string): string => {
  if (uri.startsWith('/')) {
    return `/remote${uri}`
  }
  return `/remote/${uri}`
}
