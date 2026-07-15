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

interface LanguageServerDiagnostic {
  readonly message?: string
  readonly range?: {
    readonly end?: {
      readonly character?: number
      readonly line?: number
    }
    readonly start?: {
      readonly character?: number
      readonly line?: number
    }
  }
  readonly severity?: number
  readonly source?: string
}

interface Diagnostic {
  readonly columnIndex: number
  readonly endColumnIndex: number
  readonly endRowIndex: number
  readonly message: string
  readonly rowIndex: number
  readonly source?: string
  readonly type: 'error' | 'warning'
}

const sanitizeDiagnostic = (diagnostic: LanguageServerDiagnostic): Diagnostic | undefined => {
  const start = diagnostic?.range?.start
  const end = diagnostic?.range?.end
  if (
    typeof diagnostic?.message !== 'string' ||
    typeof start?.line !== 'number' ||
    typeof start.character !== 'number' ||
    typeof end?.line !== 'number' ||
    typeof end.character !== 'number'
  ) {
    return undefined
  }
  return {
    columnIndex: start.character,
    endColumnIndex: end.character,
    endRowIndex: end.line,
    message: diagnostic.message,
    rowIndex: start.line,
    ...(typeof diagnostic.source === 'string' && { source: diagnostic.source }),
    type: diagnostic.severity === 1 ? 'error' : 'warning',
  }
}

export const executeLanguageServerDiagnostic = async (
  rpc: Rpc,
  extension: ExtensionManifest,
  textDocument: TextDocument,
): Promise<readonly Diagnostic[]> => {
  if (typeof textDocument.text !== 'string' || typeof textDocument.uri !== 'string') {
    return []
  }
  const languageServer = await resolveLanguageServer(rpc, extension, textDocument.languageId)
  if (!languageServer) {
    return []
  }
  const result = (await SharedProcess.invoke('LanguageServer.diagnostic', {
    argv: languageServer.argv,
    id: languageServer.id,
    textDocument,
    uri: languageServer.uri,
  })) as readonly LanguageServerDiagnostic[]
  return result.map(sanitizeDiagnostic).filter((diagnostic): diagnostic is Diagnostic => diagnostic !== undefined)
}
