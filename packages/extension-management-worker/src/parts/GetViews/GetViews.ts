import type { Rpc } from '@lvce-editor/rpc'
import * as GetExtensions from '../GetExtensions/GetExtensions.ts'
import { getAbsolutePath, getExtensionId } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

interface ManifestViewIframe {
  readonly credentialless?: boolean
  readonly csp?: string
  readonly path?: string
  readonly sandbox?: readonly string[]
}

interface ManifestView {
  readonly icon?: string
  readonly id?: string
  readonly iframe?: ManifestViewIframe
  readonly kind?: string
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
  readonly icon?: string
  readonly id?: string
  readonly kind?: string
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

const toView = (extension: ExtensionManifest, registeredView: RegisteredView, assetDir: string, platform: number): any => {
  const id = registeredView.id || ''
  const manifestView = getManifestView(extension, id)
  return {
    extensionId: getExtensionId(extension),
    icon: registeredView.icon || manifestView?.icon || '',
    id,
    iframe: getIframe(extension, manifestView, assetDir, platform),
    kind: registeredView.kind || manifestView?.kind || '',
    title: registeredView.title || manifestView?.title || id,
  }
}

const getRpcViewRegistrySnapshot = async (rpc: Rpc): Promise<ViewRegistrySnapshot> => {
  return rpc.invoke('ExtensionApi.getViewRegistrySnapshot')
}

const hasViewId = (view: ManifestView): view is ManifestView & { readonly id: string } => {
  return typeof view.id === 'string'
}

const toRegisteredView = (view: ManifestView & { readonly id: string }): RegisteredView => {
  return {
    ...(typeof view.icon === 'string' ? { icon: view.icon } : {}),
    id: view.id,
    ...(typeof view.kind === 'string' ? { kind: view.kind } : {}),
    ...(typeof view.title === 'string' ? { title: view.title } : {}),
  }
}

const getManifestRegisteredViews = (extension: ExtensionManifest): readonly RegisteredView[] => {
  return (extension.views || []).filter(hasViewId).map(toRegisteredView)
}

const getExtensionViews = async (extension: ExtensionManifest, assetDir: string, platform: number): Promise<readonly any[]> => {
  const manifestViews = getManifestRegisteredViews(extension)
  const existingRpc = IsolatedExtensionHostWorkerState.get(getExtensionId(extension))
  if (!existingRpc) {
    return manifestViews.map((view) => toView(extension, view, assetDir, platform))
  }
  const snapshot = await getRpcViewRegistrySnapshot(existingRpc)
  const registeredViews = Array.isArray(snapshot.views) ? snapshot.views.filter((view) => view && typeof view.id === 'string') : []
  const views = registeredViews.length > 0 ? registeredViews : manifestViews
  return views.map((view) => toView(extension, view, assetDir, platform))
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
