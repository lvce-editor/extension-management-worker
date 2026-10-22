import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { executeCompletionProvider } from '../src/parts/ExecuteCompletionProvider/ExecuteCompletionProvider.ts'
import { executeDiagnosticProvider } from '../src/parts/ExecuteDiagnosticProvider/ExecuteDiagnosticProvider.ts'
import { executeFormattingProvider } from '../src/parts/ExecuteFormattingProvider/ExecuteFormattingProvider.ts'
import { executeHoverProvider } from '../src/parts/ExecuteHoverProvider/ExecuteHoverProvider.ts'
import {
  executeLanguageProvider,
  executeOrganizeImportsProvider,
  executeSourceActionProvider,
} from '../src/parts/ExecuteLanguageProvider/ExecuteLanguageProvider.ts'
import { executeSignatureHelpProvider } from '../src/parts/ExecuteSignatureHelpProvider/ExecuteSignatureHelpProvider.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const disposables: DisposableMockRpc[] = []
const document = { languageId: 'typescript', text: 'const value = 1', uri: 'file:///workspace/main.ts' }
const extension = { id: 'optional', isolated: true, optionalLanguageServers: [{ id: 'native', languageId: 'typescript' }] }
const createState = (): ExtensionsState => ({
  activatedExtensions: Object.create(null),
  cachedActivationEvents: Object.create(null),
  cachedExtensions: undefined,
  disabledIds: [],
  platform: 1,
  runtimeStatuses: Object.create(null),
  webExtensions: [extension],
})

beforeEach(() => {
  disposables.push(RendererWorker.registerMockRpc({ 'Layout.getAssetDir': () => '/assets', 'Workspace.getPath': () => '/workspace' }))
})

afterEach(() => {
  IsolatedExtensionHostWorkerState.clear()
  for (const disposable of disposables) disposable[Symbol.dispose]()
  disposables.length = 0
})

const setBackend = (active: boolean): void => {
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string) => {
      if (method !== 'ExtensionApi.getLanguageServerRegistrySnapshot') throw new Error(`Unexpected worker invocation: ${method}`)
      return {
        languageServers: active
          ? [{ argv: ['--lsp', '--stdio'], id: 'native', languageId: 'typescript', uri: 'lvce-language-server:typescript' }]
          : [],
      }
    },
    invokeAndTransfer: async () => {},
    send() {},
  }
  IsolatedExtensionHostWorkerState.set('optional', rpc)
}

test('inactive optional-only contributions leave completion, diagnostics, formatting, hover and signatures empty', async () => {
  setBackend(false)
  const state = createState()
  await expect(executeCompletionProvider(state, document, 3)).resolves.toEqual([])
  await expect(executeDiagnosticProvider(state, document)).resolves.toEqual([])
  await expect(executeFormattingProvider(state, document)).resolves.toEqual([])
  await expect(executeHoverProvider(state, document)).resolves.toBeUndefined()
  await expect(executeSignatureHelpProvider(state, document)).resolves.toBeUndefined()
  await expect(executeLanguageProvider(state, 'definition', 'provideDefinition', document, 3)).resolves.toEqual({ found: true, result: undefined })
  await expect(executeLanguageProvider(state, 'code action', 'provideCodeActions', document, 3)).resolves.toEqual({ found: true, result: [] })
})

test('active optional-only contributions route every provider family without worker calls', async () => {
  setBackend(true)
  const requests: string[] = []
  const empty = (name: string) => () => {
    requests.push(name)
    return []
  }
  disposables.push(
    SharedProcess.registerMockRpc({
      'LanguageServer.codeAction': empty('codeAction'),
      'LanguageServer.complete': empty('complete'),
      'LanguageServer.diagnostic': empty('diagnostic'),
      'LanguageServer.feature': empty('feature'),
      'LanguageServer.format': empty('format'),
    }),
  )
  const state = createState()
  await expect(executeCompletionProvider(state, document, 3)).resolves.toEqual([])
  await expect(executeDiagnosticProvider(state, document)).resolves.toEqual([])
  await expect(executeFormattingProvider(state, document)).resolves.toEqual([])
  await expect(executeHoverProvider(state, document)).resolves.toBeUndefined()
  await expect(executeSignatureHelpProvider(state, document)).resolves.toEqual([])
  await expect(executeOrganizeImportsProvider(state, document)).resolves.toEqual({ found: true, result: [] })
  await expect(executeSourceActionProvider(state, document, 'source.sortImports')).resolves.toEqual({ found: true, result: [] })
  expect(requests).toEqual(['complete', 'diagnostic', 'format', 'feature', 'feature', 'codeAction', 'codeAction'])
})
