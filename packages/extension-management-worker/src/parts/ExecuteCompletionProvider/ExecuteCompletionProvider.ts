import type { Rpc } from '@lvce-editor/rpc'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import { getExtensionAbsolutePath } from '../GetExtensionAbsolutePath/GetExtensionAbsolutePath.ts'
import { getAllExtensions } from '../GetExtensions/GetExtensions.ts'
import * as GetOrCreateIsolatedExtensionHostWorker from '../GetOrCreateIsolatedExtensionHostWorker/GetOrCreateIsolatedExtensionHostWorker.ts'
import { interExtensionId } from '../InferExtensionId/InferExtensionId.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

interface CompletionProviderContribution {
  readonly languageId?: string
}

interface ExtensionManifest {
  readonly browser?: string
  readonly builtin?: boolean
  readonly completionProviders?: readonly CompletionProviderContribution[]
  readonly id?: string
  readonly isWeb?: boolean
  readonly path?: string
  readonly uri?: string
}

interface TextDocument {
  readonly languageId: string
}

const getExtensionId = (extension: ExtensionManifest): string => {
  return extension.id || interExtensionId(extension.uri || extension.path || '')
}

const contributesCompletionProvider = (extension: ExtensionManifest, languageId: string): boolean => {
  return Array.isArray(extension.completionProviders) && extension.completionProviders.some((provider) => provider.languageId === languageId)
}

const getOrigin = (): string => {
  return globalThis.location?.origin || 'http://localhost'
}

const getAbsolutePath = (extension: ExtensionManifest, assetDir: string, platform: number): string => {
  return getExtensionAbsolutePath(
    getExtensionId(extension),
    extension.isWeb === true,
    extension.builtin === true,
    extension.uri || extension.path || '',
    extension.browser || '',
    getOrigin(),
    platform,
    assetDir,
  )
}

const getMatchingExtensions = async (textDocument: TextDocument, assetDir: string, platform: number): Promise<readonly ExtensionManifest[]> => {
  const extensions = await getAllExtensions(assetDir, platform)
  return extensions.filter(
    (extension): boolean => IsExtensionIsolated.isExtensionIsolated(extension) && contributesCompletionProvider(extension, textDocument.languageId),
  )
}

const getRpc = async (extension: ExtensionManifest, assetDir: string, platform: number): Promise<Rpc> => {
  const extensionId = getExtensionId(extension)
  const existingRpc = IsolatedExtensionHostWorkerState.get(extensionId)
  if (existingRpc) {
    return existingRpc
  }
  const absolutePath = getAbsolutePath(extension, assetDir, platform)
  return GetOrCreateIsolatedExtensionHostWorker.getOrCreateIsolatedExtensionHostWorker(extensionId, absolutePath)
}

const executeRpcCompletionProvider = async (rpc: Rpc, textDocument: TextDocument, args: readonly unknown[]): Promise<readonly unknown[]> => {
  return rpc.invoke('ExtensionApi.executeCompletionProvider', textDocument, ...args)
}

const executeRpcResolveCompletionItemProvider = async (rpc: Rpc, textDocument: TextDocument, args: readonly unknown[]): Promise<unknown> => {
  return rpc.invoke('ExtensionApi.executeResolveCompletionItemProvider', textDocument, ...args)
}

export const executeCompletionProvider = async (textDocument: TextDocument, ...args: readonly unknown[]): Promise<readonly unknown[]> => {
  const { platform } = ExtensionsState.get()
  const assetDir = ''
  const extensions = await getMatchingExtensions(textDocument, assetDir, platform)
  const rpcs = await Promise.all(extensions.map((extension) => getRpc(extension, assetDir, platform)))
  const results = await Promise.all(rpcs.map((rpc) => executeRpcCompletionProvider(rpc, textDocument, args)))
  return results[0] || []
}

export const executeResolveCompletionItemProvider = async (textDocument: TextDocument, ...args: readonly unknown[]): Promise<unknown> => {
  const { platform } = ExtensionsState.get()
  const assetDir = ''
  const extensions = await getMatchingExtensions(textDocument, assetDir, platform)
  const rpcs = await Promise.all(extensions.map((extension) => getRpc(extension, assetDir, platform)))
  const results = await Promise.all(rpcs.map((rpc) => executeRpcResolveCompletionItemProvider(rpc, textDocument, args)))
  return results[0]
}
