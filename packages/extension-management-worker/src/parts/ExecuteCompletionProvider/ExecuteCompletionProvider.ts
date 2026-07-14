/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { Rpc } from '@lvce-editor/rpc'
import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import { executeLanguageServerCompletion } from '../ExecuteLanguageServerCompletion/ExecuteLanguageServerCompletion.ts'
import { getAllExtensionsWithState } from '../GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import { getRpc } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'

interface CompletionProviderContribution {
  readonly languageId?: string
}

interface ExtensionManifest {
  readonly browser?: string
  readonly builtin?: boolean
  readonly completionProviders?: readonly CompletionProviderContribution[]
  readonly id?: string
  readonly isWeb?: boolean
  readonly languageServers?: readonly CompletionProviderContribution[]
  readonly path?: string
  readonly uri?: string
}

interface TextDocument {
  readonly languageId: string
  readonly text?: string
  readonly uri?: string
}

const contributesCompletionProvider = (extension: ExtensionManifest, languageId: string): boolean => {
  return Array.isArray(extension.completionProviders) && extension.completionProviders.some((provider) => provider.languageId === languageId)
}

const contributesLanguageServer = (extension: ExtensionManifest, languageId: string): boolean => {
  return Array.isArray(extension.languageServers) && extension.languageServers.some((languageServer) => languageServer.languageId === languageId)
}

const getMatchingExtensions = async (
  extensionsState: ExtensionsState,
  textDocument: TextDocument,
  assetDir: string,
  platform: number,
): Promise<readonly ExtensionManifest[]> => {
  const extensions = await getAllExtensionsWithState(extensionsState, assetDir, platform)
  return extensions.filter(
    (extension): boolean =>
      IsExtensionIsolated.isExtensionIsolated(extension) &&
      (contributesCompletionProvider(extension, textDocument.languageId) || contributesLanguageServer(extension, textDocument.languageId)),
  )
}

const executeRpcCompletionProvider = async (rpc: Rpc, textDocument: TextDocument, args: readonly unknown[]): Promise<readonly unknown[]> => {
  return rpc.invoke('ExtensionApi.executeCompletionProvider', textDocument, ...args)
}

const executeExtensionCompletionProvider = async (
  rpc: Rpc,
  extension: ExtensionManifest,
  textDocument: TextDocument,
  args: readonly unknown[],
): Promise<readonly unknown[]> => {
  if (contributesLanguageServer(extension, textDocument.languageId)) {
    const offset = typeof args[0] === 'number' ? args[0] : 0
    return executeLanguageServerCompletion(rpc, extension, textDocument, offset)
  }
  return executeRpcCompletionProvider(rpc, textDocument, args)
}

const executeRpcResolveCompletionItemProvider = async (rpc: Rpc, textDocument: TextDocument, args: readonly unknown[]): Promise<unknown> => {
  return rpc.invoke('ExtensionApi.executeResolveCompletionItemProvider', textDocument, ...args)
}

export const executeCompletionProvider = async (
  extensionsState: ExtensionsState,
  textDocument: TextDocument,
  ...args: readonly unknown[]
): Promise<readonly unknown[]> => {
  const { assetDir, platform } = await getRuntimeContext('', extensionsState.platform)
  const extensions = await getMatchingExtensions(extensionsState, textDocument, assetDir, platform)
  const rpcs = await Promise.all(extensions.map((extension) => getRpc(extension, assetDir, platform)))
  const results = await Promise.all(rpcs.map((rpc, index) => executeExtensionCompletionProvider(rpc, extensions[index], textDocument, args)))
  return results[0] || []
}

export const executeResolveCompletionItemProvider = async (
  extensionsState: ExtensionsState,
  textDocument: TextDocument,
  ...args: readonly unknown[]
): Promise<unknown> => {
  const { assetDir, platform } = await getRuntimeContext('', extensionsState.platform)
  const matchingExtensions = await getMatchingExtensions(extensionsState, textDocument, assetDir, platform)
  const extensions = matchingExtensions.filter((extension) => contributesCompletionProvider(extension, textDocument.languageId))
  const rpcs = await Promise.all(extensions.map((extension) => getRpc(extension, assetDir, platform)))
  const results = await Promise.all(rpcs.map((rpc) => executeRpcResolveCompletionItemProvider(rpc, textDocument, args)))
  return results[0]
}
