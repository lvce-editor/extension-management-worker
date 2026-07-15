import type { ContributedViewIframe, ExtensionManifest, ManifestView } from '../GetViewsTypes/GetViewsTypes.ts'
import { getAbsolutePath } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'

export const getIframe = (
  extension: ExtensionManifest,
  manifestView: ManifestView | undefined,
  assetDir: string,
  platform: number,
): ContributedViewIframe | undefined => {
  const iframe = manifestView?.iframe
  if (!iframe || typeof iframe.path !== 'string' || iframe.path.length === 0) {
    return undefined
  }
  return {
    credentialless: iframe.credentialless !== false,
    csp: iframe.csp || '',
    sandbox: Array.isArray(iframe.sandbox) ? iframe.sandbox.filter((item): item is string => typeof item === 'string') : ['allow-scripts'],
    src: getAbsolutePath(
      {
        ...extension,
        browser: iframe.path,
      },
      assetDir,
      platform,
    ),
  }
}
