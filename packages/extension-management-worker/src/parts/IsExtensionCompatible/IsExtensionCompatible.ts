import { PlatformType } from '@lvce-editor/constants'

interface ExtensionCompatibility {
  readonly web?: boolean
}

interface ExtensionManifest {
  readonly browser?: string
  readonly compatibility?: ExtensionCompatibility
  readonly rpc?: readonly { readonly type?: string; readonly onRemote?: string }[]
}

export const canRunOnRemote = (extension: ExtensionManifest | null | undefined): boolean => {
  const processes = extension?.rpc?.filter((rpc) => rpc.type === 'node-process') || []
  return Boolean(extension?.browser && processes.length > 0 && processes.every((rpc) => rpc.onRemote === 'runOnRemote'))
}

export const isExtensionCompatible = (extension: ExtensionManifest | null | undefined, platform: number, hasWorkspaceTransport = false): boolean => {
  if (hasWorkspaceTransport && canRunOnRemote(extension)) return true
  return platform !== PlatformType.Web || extension?.compatibility?.web !== false
}
