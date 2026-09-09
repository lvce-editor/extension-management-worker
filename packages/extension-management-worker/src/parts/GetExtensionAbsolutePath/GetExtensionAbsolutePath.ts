import { PlatformType } from '@lvce-editor/constants'

export const getExtensionAbsolutePath = (
  id: string,
  isWeb: boolean,
  isBuiltin: boolean,
  path: string,
  relativePath: string,
  origin: string,
  platform: number,
  assetDir: string,
) => {
  if (path.startsWith('http')) {
    if (path.endsWith('/')) {
      return new URL(relativePath, path).href
    }
    return new URL(relativePath, path + '/').href
  }
  if (!path.startsWith('/')) {
    path = '/' + path
  }
  if (isWeb) {
    return path + '/' + relativePath
  }
  if (platform === PlatformType.Web) {
    return path + '/' + relativePath
  }
  if (isBuiltin) {
    const folderName = path.split(/[/\\]/).filter(Boolean).at(-1) || id
    return `${assetDir}/extensions/${folderName}/${relativePath}`
  }
  return new URL('/remote' + path + '/' + relativePath, origin).href
}
