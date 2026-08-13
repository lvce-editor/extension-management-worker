import type { Rpc } from '@lvce-editor/rpc'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import { getLanguageServerRootUri } from '../GetLanguageServerRootUri/GetLanguageServerRootUri.ts'
import { resolveLanguageServer } from '../ResolveLanguageServer/ResolveLanguageServer.ts'

interface ExtensionManifest {
  readonly id?: string
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

interface Position {
  readonly character: number
  readonly line: number
}

interface Range {
  readonly end: Position
  readonly start: Position
}

interface Location {
  readonly range?: Range
  readonly uri?: string
}

export interface Reference {
  readonly endColumnIndex: number
  readonly endRowIndex: number
  readonly startColumnIndex: number
  readonly startRowIndex: number
  readonly uri: string
}

const isPosition = (value: unknown): value is Position => {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as Position).character === 'number' &&
    typeof (value as Position).line === 'number' &&
    (value as Position).character >= 0 &&
    (value as Position).line >= 0
  )
}

const isRange = (value: unknown): value is Range => {
  return Boolean(value) && typeof value === 'object' && isPosition((value as Range).start) && isPosition((value as Range).end)
}

const normalizeUri = (uri: string): string => {
  if (uri.startsWith('/')) {
    return `file://${uri}`
  }
  return uri
}

const compareReferences = (first: Reference, second: Reference): number => {
  if (first.uri < second.uri) {
    return -1
  }
  if (first.uri > second.uri) {
    return 1
  }
  return first.startRowIndex - second.startRowIndex || first.startColumnIndex - second.startColumnIndex
}

export const fromLanguageServerResult = (result: unknown, textDocument: TextDocument): readonly Reference[] => {
  if (!Array.isArray(result)) {
    return []
  }
  const documentUri = textDocument.uri
  const normalizedDocumentUri = typeof documentUri === 'string' ? normalizeUri(documentUri) : ''
  const references: Reference[] = []
  for (const item of result) {
    const location = item as Location | undefined | null
    if (!location || typeof location !== 'object' || typeof location.uri !== 'string' || !isRange(location.range)) {
      continue
    }
    const uri = normalizeUri(location.uri) === normalizedDocumentUri && documentUri ? documentUri : location.uri
    references.push({
      endColumnIndex: location.range.end.character,
      endRowIndex: location.range.end.line,
      startColumnIndex: location.range.start.character,
      startRowIndex: location.range.start.line,
      uri,
    })
  }
  return references.toSorted(compareReferences)
}

export const executeLanguageServerReferences = async (
  rpc: Rpc,
  extension: ExtensionManifest,
  textDocument: TextDocument,
  offset: number,
): Promise<readonly Reference[]> => {
  if (typeof textDocument.text !== 'string' || typeof textDocument.uri !== 'string') {
    return []
  }
  const languageServer = await resolveLanguageServer(rpc, extension, textDocument.languageId)
  if (!languageServer) {
    return []
  }
  const rootUri = await getLanguageServerRootUri()
  const result = await SharedProcess.invoke('LanguageServer.references', {
    argv: languageServer.argv,
    extensionId: languageServer.extensionId,
    id: languageServer.id,
    offset,
    ...(rootUri && { rootUri }),
    textDocument,
    uri: languageServer.uri,
  })
  return fromLanguageServerResult(result, textDocument)
}
