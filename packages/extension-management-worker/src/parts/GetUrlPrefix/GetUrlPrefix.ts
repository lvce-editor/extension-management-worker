import { PlatformType } from '@lvce-editor/constants'

export const getUrlPrefix = (platform: any, extensionPath: string) => {
  if (extensionPath.startsWith('http://') || extensionPath.startsWith('https://')) {
    return extensionPath
  }
  if (platform === PlatformType.Web) {
    return extensionPath
  }
  if (extensionPath.startsWith('/')) {
    return `/remote${extensionPath}`
  }
  return `/remote/${extensionPath}`
}
