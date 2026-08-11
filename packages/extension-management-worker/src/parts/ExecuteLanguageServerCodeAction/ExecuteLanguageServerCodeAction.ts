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

interface LanguageServerCodeAction {
  readonly edit?: {
    readonly changes?: Readonly<Record<string, readonly LanguageServerTextEdit[]>>
  }
  readonly title?: string
}

interface OffsetBasedEdit {
  readonly endOffset: number
  readonly inserted: string
  readonly startOffset: number
}

interface CodeAction {
  readonly edits: readonly OffsetBasedEdit[]
  readonly name: string
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

const normalizeDocumentUri = (uri: string): string => {
  return uri.startsWith('/') ? `file://${uri}` : uri
}

const sanitizeCodeAction = (text: string, documentUri: string, action: LanguageServerCodeAction): CodeAction | undefined => {
  if (!action || typeof action !== 'object' || typeof action.title !== 'string') {
    return undefined
  }
  const changes = action.edit?.changes
  if (!changes || typeof changes !== 'object') {
    return undefined
  }
  const edits = changes[documentUri] || changes[normalizeDocumentUri(documentUri)]
  if (!Array.isArray(edits)) {
    return undefined
  }
  const sanitizedEdits = edits.map((edit) => sanitizeTextEdit(text, edit)).filter((edit): edit is OffsetBasedEdit => edit !== undefined)
  if (sanitizedEdits.length === 0) {
    return undefined
  }
  return {
    edits: sanitizedEdits,
    name: action.title,
  }
}

export const executeLanguageServerCodeAction = async (
  rpc: Rpc,
  extension: ExtensionManifest,
  textDocument: TextDocument,
  offset: number,
): Promise<readonly CodeAction[]> => {
  const { text, uri: documentUri } = textDocument
  if (typeof text !== 'string' || typeof documentUri !== 'string') {
    return []
  }
  const languageServer = await resolveLanguageServer(rpc, extension, textDocument.languageId)
  if (!languageServer) {
    return []
  }
  const rootUri = await getLanguageServerRootUri()
  const result = (await SharedProcess.invoke('LanguageServer.codeAction', {
    argv: languageServer.argv,
    extensionId: languageServer.extensionId,
    id: languageServer.id,
    offset,
    ...(rootUri && { rootUri }),
    textDocument,
    uri: languageServer.uri,
  })) as readonly LanguageServerCodeAction[]
  return result.map((action) => sanitizeCodeAction(text, documentUri, action)).filter((action): action is CodeAction => action !== undefined)
}
