import type { Rpc } from '@lvce-editor/rpc'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import { getExtensionAbsolutePath } from '../GetExtensionAbsolutePath/GetExtensionAbsolutePath.ts'
import { getAllExtensions } from '../GetExtensions/GetExtensions.ts'
import * as GetOrCreateIsolatedExtensionHostWorker from '../GetOrCreateIsolatedExtensionHostWorker/GetOrCreateIsolatedExtensionHostWorker.ts'
import { interExtensionId } from '../InferExtensionId/InferExtensionId.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

interface FormattingProviderContribution {
  readonly languageId?: string
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

const getExtensionId = (extension: ExtensionManifest): string => {
  return extension.id || interExtensionId(extension.uri || extension.path || '')
}

const contributesFormattingProvider = (extension: ExtensionManifest, languageId: string): boolean => {
  return Array.isArray(extension.formattingProviders) && extension.formattingProviders.some((provider) => provider.languageId === languageId)
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
  return extensions.filter((extension): boolean => IsExtensionIsolated.isExtensionIsolated(extension) && contributesFormattingProvider(extension, textDocument.languageId))
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

const executeRpcFormattingProvider = async (rpc: Rpc, textDocument: TextDocument, args: readonly unknown[]): Promise<readonly unknown[]> => {
  return rpc.invoke('ExtensionApi.executeFormattingProvider', textDocument, ...args)
}

export const executeFormattingProvider = async (textDocument: any, ...args: readonly unknown[]): Promise<readonly unknown[]> => {
  const { platform } = ExtensionsState.get()
  const assetDir = ''
  const extensions = await getMatchingExtensions(textDocument, assetDir, platform)
  const rpcs = await Promise.all(extensions.map((extension) => getRpc(extension, assetDir, platform)))
  const results = await Promise.all(rpcs.map((rpc) => executeRpcFormattingProvider(rpc, textDocument, args)))
  return results[0] || []
}
