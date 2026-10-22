import type { Rpc } from '@lvce-editor/rpc'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import { executeLanguageServerCodeAction } from '../ExecuteLanguageServerCodeAction/ExecuteLanguageServerCodeAction.ts'
import { executeLanguageServerCompletion } from '../ExecuteLanguageServerCompletion/ExecuteLanguageServerCompletion.ts'
import {
  fromLanguageServerResult as convertDefinition,
  executeLanguageServerDefinition,
} from '../ExecuteLanguageServerDefinition/ExecuteLanguageServerDefinition.ts'
import { executeLanguageServerDiagnostic } from '../ExecuteLanguageServerDiagnostic/ExecuteLanguageServerDiagnostic.ts'
import { executeLanguageServerDocumentSymbols } from '../ExecuteLanguageServerDocumentSymbols/ExecuteLanguageServerDocumentSymbols.ts'
import { executeLanguageServerFormatting } from '../ExecuteLanguageServerFormatting/ExecuteLanguageServerFormatting.ts'
import {
  fromLanguageServerResult as convertReferences,
  executeLanguageServerReferences,
} from '../ExecuteLanguageServerReferences/ExecuteLanguageServerReferences.ts'
import { getLanguageServerRootUri } from '../GetLanguageServerRootUri/GetLanguageServerRootUri.ts'
import { resolveLanguageServer } from '../ResolveLanguageServer/ResolveLanguageServer.ts'

interface ExtensionManifest {
  readonly id?: string
  readonly optionalLanguageServers?: readonly { readonly connectionId?: string; readonly id?: string; readonly languageId?: string }[]
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

interface TextEdit {
  readonly newText: string
  readonly range: Range
}

interface WorkspaceEdit {
  readonly changes?: Readonly<Record<string, readonly TextEdit[]>>
  readonly documentChanges?: readonly { readonly edits: readonly TextEdit[]; readonly textDocument: { readonly uri: string } }[]
}

const offsetAt = (text: string, position: Position): number => {
  const lines = text.split('\n')
  let offset = 0
  for (let index = 0; index < position.line && index < lines.length; index++) {
    offset += lines[index].length + 1
  }
  return Math.min(text.length, offset + position.character)
}

const documentationText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }
  if (value && typeof value === 'object' && 'value' in value && typeof value.value === 'string') {
    return value.value
  }
  return ''
}

const convertHover = (result: unknown): unknown => {
  if (!result || typeof result !== 'object' || !('contents' in result)) {
    return undefined
  }
  const contents = Array.isArray(result.contents) ? result.contents : [result.contents]
  return { text: contents.map(documentationText).filter(Boolean).join('\n\n') }
}

const convertRename = async (result: WorkspaceEdit | null, textDocument: TextDocument): Promise<unknown> => {
  if (!result) {
    return undefined
  }
  const changes = [
    ...Object.entries(result.changes || {}).map(([uri, edits]: readonly [string, readonly TextEdit[]]) => ({ edits, textDocument: { uri } })),
    ...(result.documentChanges || []),
  ]
  const edits = await Promise.all(
    changes.map(async (change) => {
      const { uri } = change.textDocument
      const text = uri === textDocument.uri ? textDocument.text || '' : await RendererWorker.invoke('FileSystem.readFile', uri)
      return {
        edits: change.edits.map((edit) => {
          const offset = offsetAt(text, edit.range.start)
          return { deleted: offsetAt(text, edit.range.end) - offset, inserted: edit.newText, offset }
        }),
        uri,
      }
    }),
  )
  return { canRename: true, edits }
}

export const contributesOptionalLanguageServer = (extension: ExtensionManifest, languageId: string): boolean => {
  return Boolean(extension.optionalLanguageServers?.some((item) => item.languageId === languageId))
}

// Optional contributions let activation select one backend. The registry is the source of
// truth, so changing a preference takes effect only when the extension is restarted.
export const executeOptionalLanguageServer = async (
  rpc: Rpc,
  extension: ExtensionManifest,
  kind: string,
  methodName: string,
  textDocument: TextDocument,
  args: readonly unknown[],
): Promise<{ readonly handled: boolean; readonly result?: unknown }> => {
  const contribution = extension.optionalLanguageServers?.find((item) => item.languageId === textDocument.languageId)
  if (!contribution) {
    return { handled: false }
  }
  let snapshot: { readonly languageServers: readonly { readonly id: string; readonly languageId: string }[] }
  try {
    snapshot = await rpc.invoke('ExtensionApi.getLanguageServerRegistrySnapshot')
  } catch (error) {
    // Older APIs install the registry command only after the first registration.
    if (error instanceof Error && error.message.includes('command ExtensionApi.getLanguageServerRegistrySnapshot not found')) {
      return { handled: false }
    }
    throw error
  }
  if (
    snapshot.languageServers.every(
      (item: { readonly id: string; readonly languageId: string }) => !(item.id === contribution.id && item.languageId === textDocument.languageId),
    )
  ) {
    return { handled: false }
  }
  const offset = typeof args[0] === 'number' ? args[0] : 0
  let result: unknown
  switch (kind) {
    case 'code action':
      result = await executeLanguageServerCodeAction(rpc, extension, textDocument, offset)
      break
    case 'completion':
      result = await executeLanguageServerCompletion(rpc, extension, textDocument, offset)
      break
    case 'definition':
      result = await executeLanguageServerDefinition(rpc, extension, textDocument, offset)
      break
    case 'diagnostic':
      result = await executeLanguageServerDiagnostic(rpc, extension, textDocument)
      break
    case 'document symbol':
      result = await executeLanguageServerDocumentSymbols(rpc, extension, textDocument)
      break
    case 'formatting':
      result = await executeLanguageServerFormatting(rpc, extension, textDocument)
      break
    case 'reference':
      result = await executeLanguageServerReferences(rpc, extension, textDocument, offset)
      break
    case 'source action': {
      const actions = await executeLanguageServerCodeAction(rpc, extension, textDocument, 0, String(args[0]))
      result = actions.flatMap((action) => action.edits)
      break
    }
    default:
      result = await executeAdditionalFeature(rpc, extension, kind, methodName, textDocument, offset, args)
  }
  return { handled: true, result }
}

const executeAdditionalFeature = async (
  rpc: Rpc,
  extension: ExtensionManifest,
  kind: string,
  methodName: string,
  textDocument: TextDocument,
  offset: number,
  args: readonly unknown[],
): Promise<unknown> => {
  const methods: Readonly<Record<string, string>> = {
    hover: 'hover',
    implementation: 'implementation',
    rename: methodName === 'prepareRename' ? 'prepareRename' : 'rename',
    'signature help': 'signatureHelp',
    'type definition': 'typeDefinition',
  }
  const method = methods[kind]
  // Editor-specific conveniences have no LSP equivalent. Never start the old backend.
  if (!method || typeof textDocument.text !== 'string' || typeof textDocument.uri !== 'string') {
    return undefined
  }
  const languageServer = await resolveLanguageServer(rpc, extension, textDocument.languageId)
  const rootUri = await getLanguageServerRootUri()
  const result = await SharedProcess.invoke('LanguageServer.feature', {
    ...languageServer,
    method,
    newName: args[1],
    offset,
    ...(rootUri && { rootUri }),
    textDocument,
  })
  if (kind === 'hover') {
    return convertHover(result)
  }
  if (kind === 'type definition') {
    return convertDefinition(result, textDocument)
  }
  if (kind === 'implementation') {
    return convertReferences(result, textDocument)
  }
  if (kind === 'signature help' && result && Array.isArray(result.signatures)) {
    return {
      activeParameter: result.activeParameter || 0,
      activeSignature: result.activeSignature || 0,
      signatures: result.signatures.map(
        (signature: {
          readonly documentation?: unknown
          readonly label: string
          readonly parameters?: readonly { readonly documentation?: unknown; readonly label: string }[]
        }) => ({
          ...signature,
          documentation: documentationText(signature.documentation),
          parameters: (signature.parameters || []).map((parameter) => ({ ...parameter, documentation: documentationText(parameter.documentation) })),
        }),
      ),
    }
  }
  if (kind === 'rename') {
    if (method === 'prepareRename') {
      if (!result) {
        return undefined
      }
      const range: Range = result.range || result
      const start = offsetAt(textDocument.text, range.start)
      const length = offsetAt(textDocument.text, range.end) - start
      return { placeholder: result.placeholder || textDocument.text.slice(start, start + length), range: { length, start } }
    }
    return convertRename(result, textDocument)
  }
  return result
}
