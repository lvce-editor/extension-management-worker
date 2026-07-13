/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { Rpc } from '@lvce-editor/rpc'
import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import { getAllExtensionsWithState } from '../GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import { getRpc } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'

interface DiagnosticProviderContribution {
  readonly languageId?: string
}

interface ExtensionManifest {
  readonly browser?: string
  readonly builtin?: boolean
  readonly diagnosticProviders?: readonly DiagnosticProviderContribution[]
  readonly id?: string
  readonly isWeb?: boolean
  readonly path?: string
  readonly uri?: string
}

interface TextDocument {
  readonly languageId: string
}

const contributesDiagnosticProvider = (extension: ExtensionManifest, languageId: string): boolean => {
  return Array.isArray(extension.diagnosticProviders) && extension.diagnosticProviders.some((provider) => provider.languageId === languageId)
}

const getMatchingExtensions = async (
  extensionsState: ExtensionsState,
  textDocument: TextDocument,
  assetDir: string,
  platform: number,
): Promise<readonly ExtensionManifest[]> => {
  const extensions = await getAllExtensionsWithState(extensionsState, assetDir, platform)
  return extensions.filter(
    (extension): boolean => IsExtensionIsolated.isExtensionIsolated(extension) && contributesDiagnosticProvider(extension, textDocument.languageId),
  )
}

const executeRpcDiagnosticProvider = async (rpc: Rpc, textDocument: TextDocument, args: readonly unknown[]): Promise<readonly unknown[]> => {
  return rpc.invoke('ExtensionApi.executeDiagnosticProvider', textDocument, ...args)
}

export const executeDiagnosticProvider = async (
  extensionsState: ExtensionsState,
  textDocument: TextDocument,
  ...args: readonly unknown[]
): Promise<readonly unknown[]> => {
  const { assetDir, platform } = await getRuntimeContext('', extensionsState.platform)
  const extensions = await getMatchingExtensions(extensionsState, textDocument, assetDir, platform)
  const rpcs = await Promise.all(extensions.map((extension) => getRpc(extension, assetDir, platform)))
  const results = await Promise.all(rpcs.map((rpc) => executeRpcDiagnosticProvider(rpc, textDocument, args)))
  return results.flat()
}
