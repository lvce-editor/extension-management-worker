/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { Rpc } from '@lvce-editor/rpc'
import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import { executeLanguageServerDiagnostic } from '../ExecuteLanguageServerDiagnostic/ExecuteLanguageServerDiagnostic.ts'
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
  readonly disabled?: boolean
  readonly id?: string
  readonly isWeb?: boolean
  readonly languageServers?: readonly DiagnosticProviderContribution[]
  readonly path?: string
  readonly uri?: string
}

interface TextDocument {
  readonly languageId: string
}

interface DiagnosticProviderResultPort {
  postMessage(message: unknown): void
}

const contributesDiagnosticProvider = (extension: ExtensionManifest, languageId: string): boolean => {
  return Array.isArray(extension.diagnosticProviders) && extension.diagnosticProviders.some((provider) => provider.languageId === languageId)
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
      !extension.disabled &&
      IsExtensionIsolated.isExtensionIsolated(extension) &&
      (contributesDiagnosticProvider(extension, textDocument.languageId) || contributesLanguageServer(extension, textDocument.languageId)),
  )
}

const executeRpcDiagnosticProvider = async (rpc: Rpc, textDocument: TextDocument, args: readonly unknown[]): Promise<readonly unknown[]> => {
  return rpc.invoke('ExtensionApi.executeDiagnosticProvider', textDocument, ...args)
}

const executeExtensionDiagnosticProvider = async (
  rpc: Rpc,
  extension: ExtensionManifest,
  textDocument: TextDocument,
  args: readonly unknown[],
): Promise<readonly unknown[]> => {
  if (contributesLanguageServer(extension, textDocument.languageId)) {
    return executeLanguageServerDiagnostic(rpc, extension, textDocument)
  }
  return executeRpcDiagnosticProvider(rpc, textDocument, args)
}

const executeMatchingDiagnosticProvider = async (
  extension: ExtensionManifest,
  textDocument: TextDocument,
  args: readonly unknown[],
  assetDir: string,
  platform: number,
  resultPort: DiagnosticProviderResultPort | undefined,
  providerIndex: number,
): Promise<readonly unknown[]> => {
  const providerId = extension.id ?? extension.uri ?? extension.path ?? String(providerIndex)
  let diagnostics: readonly unknown[] = []
  let providerError: string | undefined
  try {
    const rpc = await getRpc(extension, assetDir, platform, `onDiagnostic:${textDocument.languageId}`)
    diagnostics = await executeExtensionDiagnosticProvider(rpc, extension, textDocument, args)
  } catch (error) {
    // Preserve failure information for callers waiting for a successful diagnostics pass.
    // Other providers still deliver their results.
    providerError = error instanceof Error ? error.message : String(error)
  }
  resultPort?.postMessage({ diagnostics, ...(providerError !== undefined && { error: providerError }), providerId, providerIndex, type: 'result' })
  return diagnostics
}

const executeDiagnosticProviders = async (
  extensionsState: ExtensionsState,
  textDocument: TextDocument,
  resultPort?: DiagnosticProviderResultPort,
  ...args: readonly unknown[]
): Promise<readonly unknown[]> => {
  const { assetDir, platform } = await getRuntimeContext('', extensionsState.platform)
  const extensions = await getMatchingExtensions(extensionsState, textDocument, assetDir, platform)
  resultPort?.postMessage({
    providerCount: extensions.length,
    providerIds: extensions.map((extension, index) => extension.id ?? extension.uri ?? extension.path ?? String(index)),
    type: 'providers',
  })
  const results = await Promise.all(
    extensions.map((extension, providerIndex) =>
      executeMatchingDiagnosticProvider(extension, textDocument, args, assetDir, platform, resultPort, providerIndex),
    ),
  )
  resultPort?.postMessage({ type: 'done' })
  return results.flat()
}

export const executeDiagnosticProvider = async (
  extensionsState: ExtensionsState,
  textDocument: TextDocument,
  ...args: readonly unknown[]
): Promise<readonly unknown[]> => {
  return executeDiagnosticProviders(extensionsState, textDocument, undefined, ...args)
}

export const streamDiagnosticProvider = async (
  extensionsState: ExtensionsState,
  textDocument: TextDocument,
  resultPort: DiagnosticProviderResultPort,
  ...args: readonly unknown[]
): Promise<void> => {
  await executeDiagnosticProviders(extensionsState, textDocument, resultPort, ...args)
}
