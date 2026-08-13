/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { Rpc } from '@lvce-editor/rpc'
import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import { executeLanguageServerCodeAction } from '../ExecuteLanguageServerCodeAction/ExecuteLanguageServerCodeAction.ts'
import { executeLanguageServerDefinition } from '../ExecuteLanguageServerDefinition/ExecuteLanguageServerDefinition.ts'
import { executeLanguageServerReferences } from '../ExecuteLanguageServerReferences/ExecuteLanguageServerReferences.ts'
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
  readonly languageServers?: readonly {
    readonly id?: string
    readonly languageId?: string
  }[]
  readonly path?: string
  readonly uri?: string
}

interface TextDocument {
  readonly languageId: string
  readonly text?: string
  readonly uri?: string
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

const contributesCodeActionProvider = (extension: ExtensionManifest, languageId: string): boolean => {
  const hasCodeActionActivation = extension.activation?.includes(`onCodeAction:${languageId}`)
  const hasLegacyCodeActions = Array.isArray(extension.codeActions) && extension.activation?.includes(`onLanguage:${languageId}`)
  return Boolean(hasCodeActionActivation || hasLegacyCodeActions)
}

const contributesLanguageServer = (extension: ExtensionManifest, languageId: string): boolean => {
  return Boolean(extension.languageServers?.some((languageServer) => languageServer.languageId === languageId))
}

const contributesLanguageProvider = (extension: ExtensionManifest, kind: string, languageId: string): boolean => {
  if (kind === 'code action') {
    return contributesCodeActionProvider(extension, languageId) || contributesLanguageServer(extension, languageId)
  }
  if ((kind === 'definition' || kind === 'reference') && contributesLanguageServer(extension, languageId)) {
    return true
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

const contributesExplicitLanguageProvider = (extension: ExtensionManifest, kind: string, languageId: string): boolean => {
  if (kind === 'code action') {
    return contributesCodeActionProvider(extension, languageId)
  }
  const activationEvent = activationEventByKind[kind] || 'onLanguage'
  return Array.isArray(extension.activation) && extension.activation.includes(`${activationEvent}:${languageId}`)
}

const executeExtensionLanguageProvider = async (
  rpc: Rpc,
  extension: ExtensionManifest,
  kind: string,
  methodName: string,
  textDocument: TextDocument,
  args: readonly unknown[],
): Promise<unknown> => {
  if (kind === 'code action' && !contributesExplicitLanguageProvider(extension, kind, textDocument.languageId)) {
    const offset = typeof args[0] === 'number' ? args[0] : 0
    return executeLanguageServerCodeAction(rpc, extension, textDocument, offset)
  }
  if (kind === 'definition' && !contributesExplicitLanguageProvider(extension, kind, textDocument.languageId)) {
    const offset = typeof args[0] === 'number' ? args[0] : 0
    return executeLanguageServerDefinition(rpc, extension, textDocument, offset)
  }
  if (kind === 'reference' && !contributesExplicitLanguageProvider(extension, kind, textDocument.languageId)) {
    const offset = typeof args[0] === 'number' ? args[0] : 0
    return executeLanguageServerReferences(rpc, extension, textDocument, offset)
  }
  return executeRpcLanguageProvider(rpc, kind, methodName, textDocument, args)
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
  const extension = extensions[0]
  const rpc = await getRpc(extension, assetDir, platform)
  const result = await executeExtensionLanguageProvider(rpc, extension, kind, methodName, textDocument, args)
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
  const results = await Promise.all(
    rpcs.map((rpc, index) => executeExtensionLanguageProvider(rpc, extensions[index], 'code action', 'provideCodeActions', textDocument, [offset])),
  )
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
