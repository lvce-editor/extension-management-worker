import type { Rpc } from '@lvce-editor/rpc'
import { SharedProcess } from '@lvce-editor/rpc-registry'
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

interface LanguageServerCompletionItem {
  readonly insertText?: string
  readonly kind?: number
  readonly label?: string
  readonly [key: string]: unknown
  readonly textEdit?: {
    readonly newText?: string
  }
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
  const languageServer = await resolveLanguageServer(rpc, extension, textDocument.languageId)
  if (!languageServer) {
    return []
  }
  const result = (await SharedProcess.invoke('LanguageServer.complete', {
    argv: languageServer.argv,
    id: languageServer.id,
    offset,
    textDocument,
    uri: languageServer.uri,
  })) as readonly LanguageServerCompletionItem[]
  return result.map(sanitizeCompletionItem).filter((item): item is Readonly<Record<string, unknown>> => item !== undefined)
}
