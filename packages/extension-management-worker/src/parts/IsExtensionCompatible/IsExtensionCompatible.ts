import { PlatformType } from '@lvce-editor/constants'

interface ExtensionCompatibility {
  readonly web?: boolean
}

interface ExtensionManifest {
  readonly compatibility?: ExtensionCompatibility
}

export const isExtensionCompatible = (extension: ExtensionManifest | null | undefined, platform: number): boolean => {
  return platform !== PlatformType.Web || extension?.compatibility?.web !== false
}
