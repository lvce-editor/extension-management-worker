import type { ExtensionManifest, ManifestView, RegisteredView } from '../GetViewsTypes/GetViewsTypes.ts'
import { getAbsolutePath } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import { isAbsoluteIcon } from '../IsAbsoluteIcon/IsAbsoluteIcon.ts'
import { isRelativeIconPath } from '../IsRelativeIconPath/IsRelativeIconPath.ts'

export const getIcon = (
  extension: ExtensionManifest,
  manifestView: ManifestView | undefined,
  registeredView: RegisteredView,
  assetDir: string,
  platform: number,
): string => {
  const manifestIcon = manifestView?.icon
  if (typeof manifestIcon === 'string' && manifestIcon.length > 0) {
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
  return registeredView.icon || ''
}
