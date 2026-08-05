/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { Rpc } from '@lvce-editor/rpc'
import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import { getAllExtensionsWithState } from '../GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import { getRpc } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'

interface SignatureHelpProviderContribution {
  readonly languageId?: string
}

interface ExtensionManifest {
  readonly browser?: string
  readonly builtin?: boolean
  readonly disabled?: boolean
  readonly id?: string
  readonly isWeb?: boolean
  readonly path?: string
  readonly signatureHelpProviders?: readonly SignatureHelpProviderContribution[]
  readonly uri?: string
}

interface TextDocument {
  readonly languageId: string
}

const contributesSignatureHelpProvider = (extension: ExtensionManifest, languageId: string): boolean => {
  return Array.isArray(extension.signatureHelpProviders) && extension.signatureHelpProviders.some((provider) => provider.languageId === languageId)
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
      !extension.disabled &&
      IsExtensionIsolated.isExtensionIsolated(extension) &&
      contributesSignatureHelpProvider(extension, textDocument.languageId),
  )
}

const executeRpcSignatureHelpProvider = async (rpc: Rpc, textDocument: TextDocument, args: readonly unknown[]): Promise<unknown> => {
  return rpc.invoke('ExtensionApi.executeSignatureHelpProvider', textDocument, ...args)
}

export const executeSignatureHelpProvider = async (
  extensionsState: ExtensionsState,
  textDocument: TextDocument,
  ...args: readonly unknown[]
): Promise<unknown> => {
  const { assetDir, platform } = await getRuntimeContext('', extensionsState.platform)
  const extensions = await getMatchingExtensions(extensionsState, textDocument, assetDir, platform)
  const rpcs = await Promise.all(extensions.map((extension) => getRpc(extension, assetDir, platform)))
  const results = await Promise.all(rpcs.map((rpc) => executeRpcSignatureHelpProvider(rpc, textDocument, args)))
  return results[0]
}
