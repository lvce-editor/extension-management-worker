import type { Rpc } from '@lvce-editor/rpc'

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

export interface ResolvedLanguageServer {
  readonly argv: readonly string[]
  readonly id: string
  readonly uri: string
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

export const resolveLanguageServer = async (
  rpc: Rpc,
  extension: ExtensionManifest,
  languageId: string,
): Promise<ResolvedLanguageServer | undefined> => {
  const contribution = extension.languageServers?.find((item) => item.languageId === languageId)
  if (!contribution) {
    return undefined
  }
  const snapshot = (await rpc.invoke('ExtensionApi.getLanguageServerRegistrySnapshot')) as LanguageServerRegistrySnapshot
  const languageServer = snapshot.languageServers.find((registered) => registered.id === contribution.id && registered.languageId === languageId)
  if (!languageServer) {
    throw new Error(`language server ${contribution.id || '<unknown>'} is contributed in extension.json but not registered`)
  }
  return {
    argv: languageServer.argv,
    id: `${extension.id || extension.uri || extension.path || 'extension'}.${languageServer.id}`,
    uri: resolveLanguageServerUri(extension, languageServer.uri),
  }
}
