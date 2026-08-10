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

interface Position {
  readonly character?: number
  readonly line?: number
}

interface LanguageServerTextEdit {
  readonly newText?: string
  readonly range?: {
    readonly end?: Position
    readonly start?: Position
  }
}

interface OffsetBasedEdit {
  readonly endOffset: number
  readonly inserted: string
  readonly startOffset: number
}

interface TextDocument {
  readonly languageId: string
  readonly text?: string
  readonly uri?: string
}

const getOffset = (text: string, position: Position | undefined): number | undefined => {
  const line = position?.line
  const character = position?.character
  if (
    typeof line !== 'number' ||
    typeof character !== 'number' ||
    !Number.isSafeInteger(line) ||
    !Number.isSafeInteger(character) ||
    line < 0 ||
    character < 0
  ) {
    return undefined
  }
  let lineStart = 0
  for (let currentLine = 0; currentLine < line; currentLine++) {
    const lineBreak = text.indexOf('\n', lineStart)
    if (lineBreak === -1) {
      return undefined
    }
    lineStart = lineBreak + 1
  }
  const nextLineBreak = text.indexOf('\n', lineStart)
  const lineEnd = nextLineBreak === -1 ? text.length : nextLineBreak
  const contentEnd = lineEnd > lineStart && text[lineEnd - 1] === '\r' ? lineEnd - 1 : lineEnd
  return Math.min(lineStart + character, contentEnd)
}

const sanitizeTextEdit = (text: string, edit: LanguageServerTextEdit): OffsetBasedEdit | undefined => {
  const startOffset = getOffset(text, edit?.range?.start)
  const endOffset = getOffset(text, edit?.range?.end)
  if (typeof edit?.newText !== 'string' || startOffset === undefined || endOffset === undefined || endOffset < startOffset) {
    return undefined
  }
  return {
    endOffset,
    inserted: edit.newText,
    startOffset,
  }
}

export const executeLanguageServerFormatting = async (
  rpc: Rpc,
  extension: ExtensionManifest,
  textDocument: TextDocument,
): Promise<readonly OffsetBasedEdit[]> => {
  const { text, uri: documentUri } = textDocument
  if (typeof text !== 'string' || typeof documentUri !== 'string') {
    return []
  }
  const languageServer = await resolveLanguageServer(rpc, extension, textDocument.languageId)
  if (!languageServer) {
    return []
  }
  const rootUri = await getLanguageServerRootUri()
  const result = (await SharedProcess.invoke('LanguageServer.format', {
    argv: languageServer.argv,
    extensionId: languageServer.extensionId,
    id: languageServer.id,
    ...(rootUri && { rootUri }),
    textDocument: {
      ...textDocument,
      text,
      uri: documentUri,
    },
    uri: languageServer.uri,
  })) as readonly LanguageServerTextEdit[]
  return result.map((edit) => sanitizeTextEdit(text, edit)).filter((edit): edit is OffsetBasedEdit => edit !== undefined)
}
