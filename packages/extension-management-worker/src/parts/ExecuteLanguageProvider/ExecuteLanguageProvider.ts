/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { Rpc } from '@lvce-editor/rpc'
import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import { getAllExtensionsWithState } from '../GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import { getRpc } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'

interface ExtensionManifest {
  readonly activation?: readonly string[]
  readonly browser?: string
  readonly builtin?: boolean
  readonly codeActions?: readonly unknown[]
  readonly disabled?: boolean
  readonly id?: string
  readonly isWeb?: boolean
  readonly path?: string
  readonly uri?: string
}

interface TextDocument {
  readonly languageId: string
}

export interface LanguageProviderResult {
  readonly found: boolean
  readonly result?: unknown
}

const activationEventByKind: Readonly<Record<string, string>> = {
  'brace completion': 'onBraceCompletion',
  'closing tag': 'onClosingTag',
  definition: 'onDefinition',
  implementation: 'onImplementation',
  reference: 'onReferences',
  rename: 'onRename',
  'tab completion': 'onTabCompletion',
  'type definition': 'onTypeDefinition',
}

const contributesLanguageProvider = (extension: ExtensionManifest, kind: string, languageId: string): boolean => {
  if (kind === 'code action') {
    const hasCodeActionActivation = extension.activation?.includes(`onCodeAction:${languageId}`)
    const hasLegacyCodeActions = Array.isArray(extension.codeActions) && extension.activation?.includes(`onLanguage:${languageId}`)
    return Boolean(hasCodeActionActivation || hasLegacyCodeActions)
  }
  const activationEvent = activationEventByKind[kind] || 'onLanguage'
  return Array.isArray(extension.activation) && extension.activation.includes(`${activationEvent}:${languageId}`)
}

const getMatchingExtensions = async (
  extensionsState: ExtensionsState,
  kind: string,
  textDocument: TextDocument,
  assetDir: string,
  platform: number,
): Promise<readonly ExtensionManifest[]> => {
  const extensions = await getAllExtensionsWithState(extensionsState, assetDir, platform)
  return extensions.filter(
    (extension): boolean =>
      !extension.disabled &&
      IsExtensionIsolated.isExtensionIsolated(extension) &&
      contributesLanguageProvider(extension, kind, textDocument.languageId),
  )
}

const executeRpcLanguageProvider = async (
  rpc: Rpc,
  kind: string,
  methodName: string,
  textDocument: TextDocument,
  args: readonly unknown[],
): Promise<unknown> => {
  return rpc.invoke('ExtensionApi.executeLanguageProvider', kind, methodName, textDocument, ...args)
}

export const executeLanguageProvider = async (
  extensionsState: ExtensionsState,
  kind: string,
  methodName: string,
  textDocument: TextDocument,
  ...args: readonly unknown[]
): Promise<LanguageProviderResult> => {
  const { assetDir, platform } = await getRuntimeContext('', extensionsState.platform)
  const extensions = await getMatchingExtensions(extensionsState, kind, textDocument, assetDir, platform)
  if (extensions.length === 0) {
    return { found: false }
  }
  const rpc = await getRpc(extensions[0], assetDir, platform)
  const result = await executeRpcLanguageProvider(rpc, kind, methodName, textDocument, args)
  return { found: true, result }
}

export const executeCodeActionProviders = async (
  extensionsState: ExtensionsState,
  textDocument: TextDocument,
  offset: number,
): Promise<readonly unknown[]> => {
  const { assetDir, platform } = await getRuntimeContext('', extensionsState.platform)
  const extensions = await getMatchingExtensions(extensionsState, 'code action', textDocument, assetDir, platform)
  const rpcs = await Promise.all(extensions.map((extension) => getRpc(extension, assetDir, platform)))
  const results = await Promise.all(rpcs.map((rpc) => executeRpcLanguageProvider(rpc, 'code action', 'provideCodeActions', textDocument, [offset])))
  const actions: unknown[] = []
  for (const result of results) {
    if (!Array.isArray(result)) {
      throw new TypeError('Code action provider result must be an array')
    }
    actions.push(...result)
  }
  return actions
}

export const executeOrganizeImportsProvider = async (
  extensionsState: ExtensionsState,
  textDocument: TextDocument,
): Promise<LanguageProviderResult> => {
  const { assetDir, platform } = await getRuntimeContext('', extensionsState.platform)
  const extensions = await getMatchingExtensions(extensionsState, 'code action', textDocument, assetDir, platform)
  if (extensions.length === 0) {
    return { found: false }
  }
  const rpc = await getRpc(extensions[0], assetDir, platform)
  const result = await rpc.invoke('ExtensionApi.executeOrganizeImportsProvider', textDocument)
  return { found: true, result }
}
