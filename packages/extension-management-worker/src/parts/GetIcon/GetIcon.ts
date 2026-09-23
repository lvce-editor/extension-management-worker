import { PlatformType } from '@lvce-editor/constants'
import type { ExtensionManifest, ManifestView } from '../GetViewsTypes/GetViewsTypes.ts'
import { getAbsolutePath } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import { isAbsoluteIcon } from '../IsAbsoluteIcon/IsAbsoluteIcon.ts'
import { isRelativeIconPath } from '../IsRelativeIconPath/IsRelativeIconPath.ts'

const getBuiltinIconPath = (extension: ExtensionManifest, icon: string, assetDir: string, platform: number): string | undefined => {
  const extensionPathUrl = extension.path || extension.uri || ''
  if (extension.builtin !== true || extension.isWeb === true || platform === PlatformType.Web || !extensionPathUrl.startsWith('file://')) {
    return undefined
  }
  const isLocalFileUrl = icon.startsWith('file://')
  const isLocalAbsolutePath = icon.startsWith('/') || /^[A-Za-z]:[\\/]/.test(icon)
  const hasUrlScheme = /^[A-Za-z][A-Za-z\d+.-]*:/.test(icon)
  if (!isLocalFileUrl && (hasUrlScheme || (!isLocalAbsolutePath && !isRelativeIconPath(icon)))) {
    return undefined
  }

  const extensionPath = new URL(extensionPathUrl).pathname.replaceAll('\\', '/').replace(/\/$/, '')
  let iconPath = icon
  if (isLocalFileUrl) {
    iconPath = new URL(icon).pathname
  } else if (!isLocalAbsolutePath) {
    iconPath = `${extensionPath}/${icon}`
  }
  const normalizedIconPath = iconPath.replaceAll('\\', '/')
  const normalizedExtensionPath = extensionPath.replace(/^\/([A-Za-z]:\/)/, '$1')
  const normalizedAbsoluteIconPath = normalizedIconPath.replace(/^\/([A-Za-z]:\/)/, '$1')
  const isWindowsPath = /^[A-Za-z]:\//.test(normalizedExtensionPath)
  const pathToCompare = isWindowsPath ? normalizedExtensionPath.toLowerCase() : normalizedExtensionPath
  const iconPathToCompare = isWindowsPath ? normalizedAbsoluteIconPath.toLowerCase() : normalizedAbsoluteIconPath

  if (!iconPathToCompare.startsWith(`${pathToCompare}/`)) {
    return undefined
  }

  const relativePath = normalizedAbsoluteIconPath.slice(normalizedExtensionPath.length + 1)
  const folderName = normalizedExtensionPath.split('/').findLast(Boolean)
  if (!relativePath || !folderName || relativePath.split('/').includes('..')) {
    return undefined
  }

  return `${assetDir}/extensions/${folderName}/${relativePath}`
}

export const getIcon = (extension: ExtensionManifest, manifestView: ManifestView | undefined, assetDir: string, platform: number): string => {
  const manifestIcon = manifestView?.icon
  if (typeof manifestIcon === 'string' && manifestIcon.length > 0) {
    const builtinIconPath = getBuiltinIconPath(extension, manifestIcon, assetDir, platform)
    if (builtinIconPath) {
      return builtinIconPath
    }
    if (isAbsoluteIcon(manifestIcon) || !isRelativeIconPath(manifestIcon)) {
      return manifestIcon
    }
    return getAbsolutePath(
      {
        ...extension,
        browser: manifestIcon,
      },
      assetDir,
      platform,
    )
  }
  return ''
}
