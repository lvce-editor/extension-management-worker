import type { ExtensionManifest as RpcExtensionManifest } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'

interface ManifestViewIframe {
  readonly credentialless?: boolean
  readonly csp?: string
  readonly path?: string
  readonly sandbox?: readonly string[]
}

interface DomEventListener {
  readonly capture?: boolean
  readonly name: string | number
  readonly params: readonly string[]
  readonly passive?: boolean
  readonly preventDefault?: boolean
  readonly stopPropagation?: boolean
  readonly trackPointerEvents?: readonly string[]
}

export interface ManifestView {
  readonly css?: string
  readonly eventListeners?: readonly DomEventListener[]
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
  readonly disabled?: boolean
  readonly isolated?: boolean
  readonly views?: readonly ManifestView[]
}

export interface ContributedViewIframe {
  readonly credentialless: boolean
  readonly csp: string
  readonly sandbox: readonly string[]
  readonly src: string
}
