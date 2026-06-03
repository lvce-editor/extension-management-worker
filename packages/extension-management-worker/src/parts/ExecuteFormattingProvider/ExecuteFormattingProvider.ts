/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { Rpc } from '@lvce-editor/rpc'
import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import { getAllExtensionsWithState } from '../GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import { getRpc } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'

interface FormattingProviderContribution {
  readonly id?: string
  readonly languageId?: string
}

interface FormattingProviderRegistrySnapshot {
  readonly providers?: readonly {
    readonly id?: string
  }[]
}

interface ExtensionManifest {
  readonly browser?: string
  readonly builtin?: boolean
  readonly formattingProviders?: readonly FormattingProviderContribution[]
  readonly id?: string
  readonly isWeb?: boolean
  readonly path?: string
  readonly uri?: string
}

interface TextDocument {
  readonly languageId: string
}

const contributesFormattingProvider = (extension: ExtensionManifest, languageId: string): boolean => {
  return Array.isArray(extension.formattingProviders) && extension.formattingProviders.some((provider) => provider.languageId === languageId)
}

const getMatchingExtensions = async (
  extensionsState: ExtensionsState,
  textDocument: TextDocument,
  assetDir: string,
  platform: number,
): Promise<readonly ExtensionManifest[]> => {
  const extensions = await getAllExtensionsWithState(extensionsState, assetDir, platform)
  return extensions.filter(
    (extension): boolean => IsExtensionIsolated.isExtensionIsolated(extension) && contributesFormattingProvider(extension, textDocument.languageId),
  )
}

const executeRpcFormattingProvider = async (rpc: Rpc, textDocument: TextDocument, args: readonly unknown[]): Promise<readonly unknown[]> => {
  return rpc.invoke('ExtensionApi.executeFormattingProvider', textDocument, ...args)
}

const throwForMissingFormattingProviderRegistration = async (extension: ExtensionManifest, rpc: Rpc, textDocument: TextDocument): Promise<void> => {
  const manifestProviders = extension.formattingProviders?.filter((provider) => provider.languageId === textDocument.languageId && typeof provider.id === 'string') || []
  const snapshot: FormattingProviderRegistrySnapshot = await rpc.invoke('ExtensionApi.getFormattingProviderRegistrySnapshot')
  const registeredProviderIds = new Set((snapshot.providers || []).map((provider) => provider.id))
  for (const provider of manifestProviders) {
    if (!registeredProviderIds.has(provider.id)) {
      throw new Error(`formatting provider ${provider.id} is contributed in extension.json but not registered`)
    }
  }
}

const executeValidatedRpcFormattingProvider = async (
  extension: ExtensionManifest,
  rpc: Rpc,
  textDocument: TextDocument,
  args: readonly unknown[],
): Promise<readonly unknown[]> => {
  try {
    return await executeRpcFormattingProvider(rpc, textDocument, args)
  } catch (error) {
    await throwForMissingFormattingProviderRegistration(extension, rpc, textDocument)
    throw error
  }
}

export const executeFormattingProvider = async (
  extensionsState: ExtensionsState,
  textDocument: any,
  ...args: readonly unknown[]
): Promise<readonly unknown[]> => {
  const { platform } = extensionsState
  const assetDir = ''
  const extensions = await getMatchingExtensions(extensionsState, textDocument, assetDir, platform)
  const rpcs = await Promise.all(extensions.map((extension) => getRpc(extension, assetDir, platform)))
  const results = await Promise.all(rpcs.map((rpc, index) => executeValidatedRpcFormattingProvider(extensions[index], rpc, textDocument, args)))
  return results[0] || []
}
