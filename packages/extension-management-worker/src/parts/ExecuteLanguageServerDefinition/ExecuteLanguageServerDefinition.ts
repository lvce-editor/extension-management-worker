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
  readonly targetRange?: Range
  readonly targetSelectionRange?: Range
  readonly targetUri?: string
  readonly uri?: string
}

interface Definition {
  readonly endColumnIndex: number
  readonly endOffset: number
  readonly endRowIndex: number
  readonly startColumnIndex: number
  readonly startOffset: number
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

const offsetAt = (text: string, position: Position): number => {
  const lines = text.split('\n')
  if (position.line >= lines.length) {
    return text.length
  }
  let offset = 0
  for (let index = 0; index < position.line; index++) {
    offset += lines[index].length + 1
  }
  return offset + Math.min(position.character, lines[position.line].length)
}

export const fromLanguageServerResult = (result: unknown, textDocument: TextDocument): Definition | undefined => {
  const location = (Array.isArray(result) ? result[0] : result) as Location | undefined | null
  if (!location || typeof location !== 'object') {
    return undefined
  }
  const uri = location.targetUri || location.uri
  const range = location.targetSelectionRange || location.targetRange || location.range
  if (typeof uri !== 'string' || !isRange(range)) {
    return undefined
  }
  const documentUri = textDocument.uri
  const isSameDocument = typeof documentUri === 'string' && normalizeUri(uri) === normalizeUri(documentUri)
  const text = typeof textDocument.text === 'string' ? textDocument.text : ''
  return {
    endColumnIndex: range.end.character,
    endOffset: isSameDocument ? offsetAt(text, range.end) : 0,
    endRowIndex: range.end.line,
    startColumnIndex: range.start.character,
    startOffset: isSameDocument ? offsetAt(text, range.start) : 0,
    startRowIndex: range.start.line,
    uri: isSameDocument && typeof documentUri === 'string' ? documentUri : uri,
  }
}

export const executeLanguageServerDefinition = async (
  rpc: Rpc,
  extension: ExtensionManifest,
  textDocument: TextDocument,
  offset: number,
): Promise<Definition | undefined> => {
  if (typeof textDocument.text !== 'string' || typeof textDocument.uri !== 'string') {
    return undefined
  }
  const languageServer = await resolveLanguageServer(rpc, extension, textDocument.languageId)
  if (!languageServer) {
    return undefined
  }
  const rootUri = await getLanguageServerRootUri()
  const result = await SharedProcess.invoke('LanguageServer.definition', {
    argv: languageServer.argv,
    id: languageServer.id,
    offset,
    ...(rootUri && { rootUri }),
    textDocument,
    uri: languageServer.uri,
  })
  return fromLanguageServerResult(result, textDocument)
}
