import type { ExtensionManifest, ManifestView } from '../GetViewsTypes/GetViewsTypes.ts'
import { getAbsolutePath } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'

export const getCss = (extension: ExtensionManifest, manifestView: ManifestView | undefined, assetDir: string, platform: number): string => {
  const css = manifestView?.css
  if (typeof css !== 'string' || css.length === 0) {
    return ''
  }
  return getAbsolutePath(
    {
      ...extension,
      browser: css,
    },
    assetDir,
    platform,
  )
}
