import type { Rpc } from '@lvce-editor/rpc'
import { SharedProcess } from '@lvce-editor/rpc-registry'

interface LanguageServerContribution {
  readonly id?: string
  readonly languageId?: string
}

interface ExtensionManifest {
  readonly id?: string
  readonly languageServers?: readonly LanguageServerContribution[]
  readonly path?: string
  readonly uri?: string
}

interface RegisteredLanguageServer {
  readonly argv: readonly string[]
  readonly id: string
  readonly languageId: string
  readonly uri: string
}

interface LanguageServerRegistrySnapshot {
  readonly languageServers: readonly RegisteredLanguageServer[]
}

interface TextDocument {
  readonly languageId: string
  readonly text?: string
  readonly uri?: string
}

interface LanguageServerCompletionItem {
  readonly insertText?: string
  readonly kind?: number
  readonly label?: string
  readonly [key: string]: unknown
  readonly textEdit?: {
    readonly newText?: string
  }
}

const hasUriScheme = (value: string): boolean => {
  return /^[a-z][a-z\d+.-]*:/i.test(value)
}

const toExtensionBaseUri = (extensionPath: string): string => {
  if (hasUriScheme(extensionPath)) {
    return extensionPath.endsWith('/') ? extensionPath : `${extensionPath}/`
  }
  if (extensionPath.startsWith('/')) {
    return `file://${extensionPath}/`
  }
  throw new Error(`Language server extension path must be an absolute path or URI`)
}

export const resolveLanguageServerUri = (extension: ExtensionManifest, languageServerUri: string): string => {
  if (languageServerUri.startsWith('/')) {
    return `file://${languageServerUri}`
  }
  if (hasUriScheme(languageServerUri)) {
    return languageServerUri
  }
  const extensionPath = extension.uri || extension.path || ''
  return new URL(languageServerUri, toExtensionBaseUri(extensionPath)).href
}

const getContribution = (extension: ExtensionManifest, languageId: string): LanguageServerContribution | undefined => {
  return extension.languageServers?.find((contribution) => contribution.languageId === languageId)
}

const getRegisteredLanguageServer = (
  snapshot: LanguageServerRegistrySnapshot,
  contribution: LanguageServerContribution,
  languageId: string,
): RegisteredLanguageServer => {
  const languageServer = snapshot.languageServers.find((registered) => registered.id === contribution.id && registered.languageId === languageId)
  if (!languageServer) {
    throw new Error(`language server ${contribution.id || '<unknown>'} is contributed in extension.json but not registered`)
  }
  return languageServer
}

const sanitizeCompletionItem = (item: LanguageServerCompletionItem): Readonly<Record<string, unknown>> | undefined => {
  if (!item || typeof item !== 'object' || typeof item.label !== 'string') {
    return undefined
  }
  const snippet = item.insertText || item.textEdit?.newText || item.label
  return {
    ...item,
    flags: 0,
    kind: typeof item.kind === 'number' ? item.kind : 0,
    label: item.label,
    matches: [],
    snippet,
  }
}

export const executeLanguageServerCompletion = async (
  rpc: Rpc,
  extension: ExtensionManifest,
  textDocument: TextDocument,
  offset: number,
): Promise<readonly unknown[]> => {
  if (typeof textDocument.text !== 'string' || typeof textDocument.uri !== 'string') {
    return []
  }
  const contribution = getContribution(extension, textDocument.languageId)
  if (!contribution) {
    return []
  }
  const snapshot = (await rpc.invoke('ExtensionApi.getLanguageServerRegistrySnapshot')) as LanguageServerRegistrySnapshot
  const languageServer = getRegisteredLanguageServer(snapshot, contribution, textDocument.languageId)
  const uri = resolveLanguageServerUri(extension, languageServer.uri)
  const result = (await SharedProcess.invoke('LanguageServer.complete', {
    argv: languageServer.argv,
    id: `${extension.id || extension.uri || extension.path || 'extension'}.${languageServer.id}`,
    offset,
    textDocument,
    uri,
  })) as readonly LanguageServerCompletionItem[]
  return result.map(sanitizeCompletionItem).filter((item): item is Readonly<Record<string, unknown>> => item !== undefined)
}
