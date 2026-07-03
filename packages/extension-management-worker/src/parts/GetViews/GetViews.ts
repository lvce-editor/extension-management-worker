import type { Rpc } from '@lvce-editor/rpc'
import * as GetExtensions from '../GetExtensions/GetExtensions.ts'
import { getAbsolutePath, getExtensionId, getRpc } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'

interface ManifestViewIframe {
  readonly credentialless?: boolean
  readonly csp?: string
  readonly path?: string
  readonly sandbox?: readonly string[]
}

interface ManifestView {
  readonly css?: string
  readonly displayName?: string
  readonly icon?: string
  readonly id?: string
  readonly iframe?: ManifestViewIframe
  readonly kind?: string
  readonly name?: string
  readonly title?: string
}

interface ExtensionManifest {
  readonly browser?: string
  readonly builtin?: boolean
  readonly id?: string
  readonly isolated?: boolean
  readonly isWeb?: boolean
  readonly path?: string
  readonly uri?: string
  readonly views?: readonly ManifestView[]
}

interface RegisteredView {
  readonly displayName?: string
  readonly icon?: string
  readonly id?: string
  readonly kind?: string
  readonly name?: string
  readonly title?: string
}

interface ContributedViewIframe {
  readonly credentialless: boolean
  readonly csp: string
  readonly sandbox: readonly string[]
  readonly src: string
}

interface ViewRegistrySnapshot {
  readonly views?: readonly RegisteredView[]
}

const contributesViews = (extension: ExtensionManifest): boolean => {
  return Array.isArray(extension.views) && extension.views.length > 0
}

const getManifestView = (extension: ExtensionManifest, id: string): ManifestView | undefined => {
  return extension.views?.find((view) => view.id === id)
}

const getCss = (extension: ExtensionManifest, manifestView: ManifestView | undefined, assetDir: string, platform: number): string => {
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

const getIframe = (
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

const getDisplayName = (registeredView: RegisteredView, manifestView: ManifestView | undefined, id: string): string => {
  return (
    registeredView.displayName ||
    registeredView.name ||
    registeredView.title ||
    manifestView?.displayName ||
    manifestView?.name ||
    manifestView?.title ||
    id
  )
}

const toView = (extension: ExtensionManifest, registeredView: RegisteredView, assetDir: string, platform: number): any => {
  const id = registeredView.id || ''
  const manifestView = getManifestView(extension, id)
  const css = getCss(extension, manifestView, assetDir, platform)
  const displayName = getDisplayName(registeredView, manifestView, id)
  return {
    ...(css ? { css } : {}),
    displayName,
    extensionId: getExtensionId(extension),
    icon: registeredView.icon || manifestView?.icon || '',
    id,
    iframe: getIframe(extension, manifestView, assetDir, platform),
    kind: registeredView.kind || manifestView?.kind || '',
    title: displayName,
  }
}

const getRpcViewRegistrySnapshot = async (rpc: Rpc): Promise<ViewRegistrySnapshot> => {
  return rpc.invoke('ExtensionApi.getViewRegistrySnapshot')
}

const getExtensionViews = async (extension: ExtensionManifest, assetDir: string, platform: number): Promise<readonly any[]> => {
  const rpc = await getRpc(extension, assetDir, platform)
  const snapshot = await getRpcViewRegistrySnapshot(rpc)
  if (!Array.isArray(snapshot.views)) {
    return []
  }
  return snapshot.views.filter((view) => view && typeof view.id === 'string').map((view) => toView(extension, view, assetDir, platform))
}

export const getViewsFromExtensionWorkers = async (
  extensions: readonly ExtensionManifest[],
  assetDir: string,
  platform: number,
): Promise<readonly any[]> => {
  const matchingExtensions = extensions.filter((extension) => IsExtensionIsolated.isExtensionIsolated(extension) && contributesViews(extension))
  const results = await Promise.all(matchingExtensions.map((extension) => getExtensionViews(extension, assetDir, platform)))
  return results.flat()
}

export const getViews = async (assetDir: string, platform: number): Promise<readonly any[]> => {
  const extensions = await GetExtensions.getAllExtensions(assetDir, platform)
  return getViewsFromExtensionWorkers(extensions, assetDir, platform)
}
