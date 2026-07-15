import type { ExtensionManifest as RpcExtensionManifest } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'

interface ManifestViewIframe {
  readonly credentialless?: boolean
  readonly csp?: string
  readonly path?: string
  readonly sandbox?: readonly string[]
}

export interface ManifestView {
  readonly css?: string
  readonly icon?: string
  readonly id?: string
  readonly iframe?: ManifestViewIframe
  readonly kind?: string
  readonly selector?: readonly string[]
  readonly showSideBarHeader?: boolean
  readonly title?: string
  readonly type?: string
}

export interface ExtensionManifest extends RpcExtensionManifest {
  readonly isolated?: boolean
  readonly views?: readonly ManifestView[]
}

interface DomEventListener {
  readonly capture?: boolean
  readonly name: string | number
  readonly params: readonly string[]
  readonly passive?: boolean
  readonly preventDefault?: boolean
  readonly stopPropagation?: boolean
}

export interface RegisteredView {
  readonly eventListeners?: readonly DomEventListener[]
  readonly icon?: string
  readonly id?: string
  readonly kind?: string
  readonly title?: string
}

export interface ContributedViewIframe {
  readonly credentialless: boolean
  readonly csp: string
  readonly sandbox: readonly string[]
  readonly src: string
}

export interface ViewRegistrySnapshot {
  readonly views?: readonly RegisteredView[]
}
