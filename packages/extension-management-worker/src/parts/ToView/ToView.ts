import type { ExtensionManifest, RegisteredView } from '../GetViewsTypes/GetViewsTypes.ts'
import { getCss } from '../GetCss/GetCss.ts'
import { getIcon } from '../GetIcon/GetIcon.ts'
import { getIframe } from '../GetIframe/GetIframe.ts'
import { getExtensionId } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import { getManifestView } from '../GetManifestView/GetManifestView.ts'

export const toView = (extension: ExtensionManifest, registeredView: RegisteredView, assetDir: string, platform: number): any => {
  const id = registeredView.id || ''
  const manifestView = getManifestView(extension, id)
  const css = getCss(extension, manifestView, assetDir, platform)
  const selector = Array.isArray(manifestView?.selector)
    ? manifestView.selector.filter((item): item is string => typeof item === 'string')
    : undefined
  const type = typeof manifestView?.type === 'string' ? manifestView.type : undefined
  return {
    ...(css && { css }),
    ...(registeredView.eventListeners && { eventListeners: registeredView.eventListeners }),
    ...(selector && { selector }),
    ...(type && { type }),
    extensionId: getExtensionId(extension),
    icon: getIcon(extension, manifestView, registeredView, assetDir, platform),
    id,
    iframe: getIframe(extension, manifestView, assetDir, platform),
    kind: registeredView.kind || manifestView?.kind || '',
    showSideBarHeader: manifestView?.showSideBarHeader !== false,
    title: registeredView.title || manifestView?.title || id,
  }
}
