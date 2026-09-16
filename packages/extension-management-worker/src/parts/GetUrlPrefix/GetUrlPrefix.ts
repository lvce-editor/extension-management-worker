import { PlatformType } from '@lvce-editor/constants'

export const getUrlPrefix = (platform: any, extensionPath: string) => {
  if (extensionPath.startsWith('http://') || extensionPath.startsWith('https://')) {
    return extensionPath
  }
  if (platform === PlatformType.Web) {
    return extensionPath
  }
  const withoutPrefix = extensionPath.startsWith('file://') ? extensionPath.slice('file://'.length) : extensionPath
  const normalized = withoutPrefix.replaceAll('\\', '/')
  if (normalized.startsWith('/')) {
    return `/remote${normalized}`
  }
  return `/remote/${normalized}`
}
