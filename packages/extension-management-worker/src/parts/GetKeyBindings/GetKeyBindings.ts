import * as GetExtensions from '../GetExtensions/GetExtensions.ts'
import { interExtensionId } from '../InferExtensionId/InferExtensionId.ts'

interface ManifestKeyBinding {
  readonly args?: readonly unknown[]
  readonly command?: unknown
  readonly key?: unknown
  readonly when?: unknown
}

interface ExtensionManifest {
  readonly id?: string
  readonly keybindings?: readonly ManifestKeyBinding[]
  readonly path?: string
  readonly uri?: string
}

export interface ExtensionKeyBindingContribution {
  readonly args?: readonly unknown[]
  readonly command: string
  readonly extensionId: string
  readonly key: string
  readonly when?: string
}

const getExtensionId = (extension: ExtensionManifest): string => {
  return extension.id || interExtensionId(extension.uri || extension.path || '')
}

const toKeyBinding = (extension: ExtensionManifest, keybinding: ManifestKeyBinding): ExtensionKeyBindingContribution | undefined => {
  if (typeof keybinding.key !== 'string' || typeof keybinding.command !== 'string') {
    return undefined
  }
  if (keybinding.when !== undefined && typeof keybinding.when !== 'string') {
    return undefined
  }
  if (keybinding.args !== undefined && !Array.isArray(keybinding.args)) {
    return undefined
  }
  return {
    ...(keybinding.args && { args: keybinding.args }),
    command: keybinding.command,
    extensionId: getExtensionId(extension),
    key: keybinding.key,
    ...(keybinding.when && { when: keybinding.when }),
  }
}

export const getKeyBindings = async (assetDir: string, platform: number): Promise<readonly ExtensionKeyBindingContribution[]> => {
  const extensions = (await GetExtensions.getAllExtensions(assetDir, platform)) as readonly ExtensionManifest[]
  const keybindings: ExtensionKeyBindingContribution[] = []
  for (const extension of extensions) {
    if (!Array.isArray(extension.keybindings)) {
      continue
    }
    for (const keybinding of extension.keybindings) {
      const normalized = toKeyBinding(extension, keybinding)
      if (normalized) {
        keybindings.push(normalized)
      }
    }
  }
  return keybindings
}
