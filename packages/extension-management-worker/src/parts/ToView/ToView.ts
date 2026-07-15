import type { ExtensionManifest, ManifestView } from '../GetViewsTypes/GetViewsTypes.ts'
import { getCss } from '../GetCss/GetCss.ts'
import { getIcon } from '../GetIcon/GetIcon.ts'
import { getIframe } from '../GetIframe/GetIframe.ts'
import { getExtensionId } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'

export const toView = (extension: ExtensionManifest, manifestView: ManifestView, assetDir: string, platform: number): any => {
  const id = manifestView.id || ''
  const css = getCss(extension, manifestView, assetDir, platform)
  const selector = Array.isArray(manifestView?.selector)
    ? manifestView.selector.filter((item): item is string => typeof item === 'string')
    : undefined
  const type = typeof manifestView?.type === 'string' ? manifestView.type : undefined
  return {
    ...(css && { css }),
    ...(Array.isArray(manifestView.eventListeners) && { eventListeners: manifestView.eventListeners }),
    ...(selector && { selector }),
    ...(type && { type }),
    extensionId: getExtensionId(extension),
    icon: getIcon(extension, manifestView, assetDir, platform),
    id,
    iframe: getIframe(extension, manifestView, assetDir, platform),
    kind: manifestView.kind || '',
    showSideBarHeader: manifestView.showSideBarHeader !== false,
    title: manifestView.title || id,
  }
}
