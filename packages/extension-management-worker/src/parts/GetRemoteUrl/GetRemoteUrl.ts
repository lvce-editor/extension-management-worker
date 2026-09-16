export const getRemoteUrl = (uri: string): string => {
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri
  }
  const withoutPrefix = uri.startsWith('file://') ? uri.slice('file://'.length) : uri
  const normalized = withoutPrefix.replaceAll('\\', '/')
  if (normalized.startsWith('/')) {
    return `/remote${normalized}`
  }
  return `/remote/${normalized}`
}
