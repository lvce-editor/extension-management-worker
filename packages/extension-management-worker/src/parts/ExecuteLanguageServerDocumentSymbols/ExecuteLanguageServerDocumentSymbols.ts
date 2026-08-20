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

interface LanguageServerDocumentSymbol {
  readonly children?: readonly LanguageServerDocumentSymbol[]
  readonly detail?: string
  readonly kind?: number
  readonly name?: string
  readonly range?: Range
  readonly selectionRange?: Range
}

interface SymbolInformation {
  readonly kind?: number
  readonly location?: {
    readonly range?: Range
    readonly uri?: string
  }
  readonly name?: string
}

export interface DocumentSymbol {
  readonly children?: readonly DocumentSymbol[]
  readonly detail?: string
  readonly endOffset: number
  readonly kind: number
  readonly name: string
  readonly selectionEndOffset: number
  readonly selectionStartOffset: number
  readonly startOffset: number
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

const normalizeUri = (uri: string): string => {
  return uri.startsWith('/') ? `file://${uri}` : uri
}

const convertDocumentSymbol = (symbol: LanguageServerDocumentSymbol, text: string): DocumentSymbol | undefined => {
  if (typeof symbol.name !== 'string' || typeof symbol.kind !== 'number' || !isRange(symbol.range)) {
    return undefined
  }
  const selectionRange = isRange(symbol.selectionRange) ? symbol.selectionRange : symbol.range
  const children = (symbol.children || []).flatMap((child) => {
    const converted = convertDocumentSymbol(child, text)
    return converted ? [converted] : []
  })
  return {
    ...(children.length > 0 && { children }),
    ...(typeof symbol.detail === 'string' && { detail: symbol.detail }),
    endOffset: offsetAt(text, symbol.range.end),
    kind: symbol.kind,
    name: symbol.name,
    selectionEndOffset: offsetAt(text, selectionRange.end),
    selectionStartOffset: offsetAt(text, selectionRange.start),
    startOffset: offsetAt(text, symbol.range.start),
  }
}

const convertSymbolInformation = (symbol: SymbolInformation, textDocument: TextDocument): DocumentSymbol | undefined => {
  const range = symbol.location?.range
  const uri = symbol.location?.uri
  if (
    typeof symbol.name !== 'string' ||
    typeof symbol.kind !== 'number' ||
    typeof uri !== 'string' ||
    typeof textDocument.uri !== 'string' ||
    normalizeUri(uri) !== normalizeUri(textDocument.uri) ||
    !isRange(range)
  ) {
    return undefined
  }
  const text = textDocument.text || ''
  return {
    endOffset: offsetAt(text, range.end),
    kind: symbol.kind,
    name: symbol.name,
    selectionEndOffset: offsetAt(text, range.end),
    selectionStartOffset: offsetAt(text, range.start),
    startOffset: offsetAt(text, range.start),
  }
}

export const fromLanguageServerResult = (result: unknown, textDocument: TextDocument): readonly DocumentSymbol[] => {
  if (!Array.isArray(result) || typeof textDocument.text !== 'string') {
    return []
  }
  return result.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return []
    }
    const symbol = item as LanguageServerDocumentSymbol | SymbolInformation
    const converted = 'location' in symbol ? convertSymbolInformation(symbol, textDocument) : convertDocumentSymbol(symbol, textDocument.text || '')
    return converted ? [converted] : []
  })
}

export const executeLanguageServerDocumentSymbols = async (
  rpc: Rpc,
  extension: ExtensionManifest,
  textDocument: TextDocument,
): Promise<readonly DocumentSymbol[]> => {
  if (typeof textDocument.text !== 'string' || typeof textDocument.uri !== 'string') {
    return []
  }
  const languageServer = await resolveLanguageServer(rpc, extension, textDocument.languageId)
  if (!languageServer) {
    return []
  }
  const rootUri = await getLanguageServerRootUri()
  const result = await SharedProcess.invoke('LanguageServer.documentSymbols', {
    argv: languageServer.argv,
    extensionId: languageServer.extensionId,
    id: languageServer.id,
    ...(rootUri && { rootUri }),
    textDocument,
    uri: languageServer.uri,
  })
  return fromLanguageServerResult(result, textDocument)
}
