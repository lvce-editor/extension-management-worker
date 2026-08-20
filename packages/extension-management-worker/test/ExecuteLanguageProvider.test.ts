import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as ExecuteLanguageProvider from '../src/parts/ExecuteLanguageProvider/ExecuteLanguageProvider.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const state: { rendererWorker: DisposableMockRpc | undefined } = {
  rendererWorker: undefined,
}

const createExtensionsState = (webExtensions: readonly any[]): ExtensionsState => ({
  activatedExtensions: Object.create(null),
  cachedActivationEvents: Object.create(null),
  cachedExtensions: undefined,
  disabledIds: [],
  platform: 1,
  runtimeStatuses: Object.create(null),
  webExtensions,
})

beforeEach(() => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'Layout.getAssetDir'() {
      return '/assets'
    },
  })
})

afterEach(() => {
  IsolatedExtensionHostWorkerState.clear()
  state.rendererWorker?.[Symbol.dispose]()
  state.rendererWorker = undefined
})

test('executes the matching isolated definition provider', async () => {
  const invocations: unknown[] = []
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...params: readonly unknown[]) => {
      invocations.push([method, ...params])
      return { uri: '/definition.ts' }
    },
    invokeAndTransfer: async () => {},
    send() {},
  }
  IsolatedExtensionHostWorkerState.set('typescript', rpc)
  const extensionsState = createExtensionsState([
    {
      activation: ['onDefinition:typescript'],
      id: 'typescript',
      isolated: true,
    },
  ])
  const textDocument = { languageId: 'typescript', text: 'value', uri: '/test.ts' }
  await expect(ExecuteLanguageProvider.executeLanguageProvider(extensionsState, 'definition', 'provideDefinition', textDocument, 2)).resolves.toEqual(
    { found: true, result: { uri: '/definition.ts' } },
  )
  expect(invocations).toEqual([['ExtensionApi.executeLanguageProvider', 'definition', 'provideDefinition', textDocument, 2]])
})

test('executes the matching isolated document symbol provider', async () => {
  const invocations: unknown[] = []
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...params: readonly unknown[]) => {
      invocations.push([method, ...params])
      return [{ endOffset: 5, kind: 12, name: 'value', selectionEndOffset: 5, selectionStartOffset: 0, startOffset: 0 }]
    },
    invokeAndTransfer: async () => {},
    send() {},
  }
  IsolatedExtensionHostWorkerState.set('typescript', rpc)
  const extensionsState = createExtensionsState([
    {
      activation: ['onDocumentSymbol:typescript'],
      id: 'typescript',
      isolated: true,
    },
  ])
  const textDocument = { languageId: 'typescript', text: 'value', uri: '/test.ts' }

  await expect(
    ExecuteLanguageProvider.executeLanguageProvider(extensionsState, 'document symbol', 'provideDocumentSymbols', textDocument),
  ).resolves.toEqual({
    found: true,
    result: [{ endOffset: 5, kind: 12, name: 'value', selectionEndOffset: 5, selectionStartOffset: 0, startOffset: 0 }],
  })
  expect(invocations).toEqual([['ExtensionApi.executeLanguageProvider', 'document symbol', 'provideDocumentSymbols', textDocument]])
})

test('routes language server definition contributions through the shared process', async () => {
  const textDocument = {
    languageId: 'elm',
    text: 'greeting = "Hello"\nmain = greeting',
    uri: 'file:///workspace/src/Main.elm',
  }
  const extensionsState = createExtensionsState([
    {
      id: 'builtin.language-features-elm',
      isolated: true,
      languageServers: [{ id: 'elm-language-server', languageId: 'elm' }],
      uri: 'file:///extension',
    },
  ])
  const sharedProcess = SharedProcess.registerMockRpc({
    'LanguageServer.definition'() {
      return {
        range: {
          end: { character: 8, line: 0 },
          start: { character: 0, line: 0 },
        },
        uri: textDocument.uri,
      }
    },
  })
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async () => ({
      languageServers: [
        {
          argv: [],
          id: 'elm-language-server',
          languageId: 'elm',
          uri: 'dist/elm-language-server.mjs',
        },
      ],
    }),
    invokeAndTransfer: async () => {},
    send() {},
  }
  IsolatedExtensionHostWorkerState.set('builtin.language-features-elm', rpc)

  try {
    await expect(
      ExecuteLanguageProvider.executeLanguageProvider(extensionsState, 'definition', 'provideDefinition', textDocument, 30),
    ).resolves.toEqual({
      found: true,
      result: {
        endColumnIndex: 8,
        endOffset: 8,
        endRowIndex: 0,
        startColumnIndex: 0,
        startOffset: 0,
        startRowIndex: 0,
        uri: textDocument.uri,
      },
    })
  } finally {
    sharedProcess[Symbol.dispose]()
  }
})

test('routes language server reference contributions through the shared process', async () => {
  const textDocument = {
    languageId: 'zig',
    text: 'const greeting = "Hello";\n_ = greeting;',
    uri: 'file:///workspace/src/main.zig',
  }
  const extensionsState = createExtensionsState([
    {
      id: 'builtin.language-features-zig',
      isolated: true,
      languageServers: [{ id: 'zls', languageId: 'zig' }],
      uri: 'file:///extension',
    },
  ])
  const sharedProcess = SharedProcess.registerMockRpc({
    'LanguageServer.references'() {
      return [
        {
          range: {
            end: { character: 14, line: 0 },
            start: { character: 6, line: 0 },
          },
          uri: textDocument.uri,
        },
      ]
    },
  })
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async () => ({
      languageServers: [
        {
          argv: [],
          id: 'zls',
          languageId: 'zig',
          uri: 'dist/language-server/zls.sh',
        },
      ],
    }),
    invokeAndTransfer: async () => {},
    send() {},
  }
  IsolatedExtensionHostWorkerState.set('builtin.language-features-zig', rpc)

  try {
    await expect(
      ExecuteLanguageProvider.executeLanguageProvider(extensionsState, 'reference', 'provideReferences2', textDocument, 8),
    ).resolves.toEqual({
      found: true,
      result: [
        {
          endColumnIndex: 14,
          endRowIndex: 0,
          startColumnIndex: 6,
          startRowIndex: 0,
          uri: textDocument.uri,
        },
      ],
    })
  } finally {
    sharedProcess[Symbol.dispose]()
  }
})

test('reports no provider when no activation event matches', async () => {
  await expect(
    ExecuteLanguageProvider.executeLanguageProvider(createExtensionsState([]), 'definition', 'provideDefinition', { languageId: 'typescript' }, 2),
  ).resolves.toEqual({ found: false })
})

test('reports no provider when the matching extension is disabled', async () => {
  const invocations: unknown[] = []
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...params: readonly unknown[]) => {
      invocations.push([method, ...params])
      return { uri: '/definition.ts' }
    },
    invokeAndTransfer: async () => {},
    send() {},
  }
  IsolatedExtensionHostWorkerState.set('typescript', rpc)
  const extensionsState = createExtensionsState([
    {
      activation: ['onDefinition:typescript'],
      disabled: true,
      id: 'typescript',
      isolated: true,
    },
  ])

  await expect(
    ExecuteLanguageProvider.executeLanguageProvider(extensionsState, 'definition', 'provideDefinition', { languageId: 'typescript' }, 2),
  ).resolves.toEqual({ found: false })

  expect(invocations).toEqual([])
})

test('merges matching code action provider results', async () => {
  const firstInvocations: unknown[] = []
  const secondInvocations: unknown[] = []
  const firstRpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...params: readonly unknown[]) => {
      firstInvocations.push([method, ...params])
      return [{ name: 'Organize Imports' }]
    },
    invokeAndTransfer: async () => {},
    send() {},
  }
  const secondRpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...params: readonly unknown[]) => {
      secondInvocations.push([method, ...params])
      return [{ name: "Fix 'quotes' problem" }]
    },
    invokeAndTransfer: async () => {},
    send() {},
  }
  IsolatedExtensionHostWorkerState.set('typescript', firstRpc)
  IsolatedExtensionHostWorkerState.set('eslint', secondRpc)
  const extensionsState = createExtensionsState([
    {
      activation: ['onLanguage:javascript'],
      codeActions: [{ name: 'Organize Imports' }],
      id: 'typescript',
      isolated: true,
    },
    {
      activation: ['onCodeAction:javascript'],
      id: 'eslint',
      isolated: true,
    },
    {
      activation: ['onLanguage:javascript'],
      id: 'formatting-only',
      isolated: true,
    },
  ])
  const textDocument = { languageId: 'javascript', text: 'const value = "test"', uri: '/test.js' }

  await expect(ExecuteLanguageProvider.executeCodeActionProviders(extensionsState, textDocument, 15)).resolves.toEqual([
    { name: 'Organize Imports' },
    { name: "Fix 'quotes' problem" },
  ])
  expect(firstInvocations).toEqual([['ExtensionApi.executeLanguageProvider', 'code action', 'provideCodeActions', textDocument, 15]])
  expect(secondInvocations).toEqual([['ExtensionApi.executeLanguageProvider', 'code action', 'provideCodeActions', textDocument, 15]])
})

test('routes language server code action contributions through the shared process', async () => {
  const textDocument = {
    languageId: 'elm',
    text: 'module Main exposing (main)\n\nimport Task\n\nmain = 1',
    uri: 'file:///workspace/src/Main.elm',
  }
  const extensionsState = createExtensionsState([
    {
      id: 'builtin.language-features-elm',
      isolated: true,
      languageServers: [{ id: 'elm-language-server', languageId: 'elm' }],
      uri: 'file:///extension',
    },
  ])
  const invocations: unknown[] = []
  const sharedProcess = SharedProcess.registerMockRpc({
    'LanguageServer.codeAction'(options: unknown) {
      invocations.push(options)
      return [
        {
          edit: {
            changes: {
              [textDocument.uri]: [
                {
                  newText: '',
                  range: {
                    end: { character: 0, line: 3 },
                    start: { character: 0, line: 2 },
                  },
                },
              ],
            },
          },
          kind: 'quickfix',
          title: 'Remove unused import `Task`',
        },
      ]
    },
  })
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async () => ({
      languageServers: [
        {
          argv: [],
          id: 'elm-language-server',
          languageId: 'elm',
          uri: 'dist/elm-language-server.mjs',
        },
      ],
    }),
    invokeAndTransfer: async () => {},
    send() {},
  }
  IsolatedExtensionHostWorkerState.set('builtin.language-features-elm', rpc)

  try {
    await expect(ExecuteLanguageProvider.executeCodeActionProviders(extensionsState, textDocument, 37)).resolves.toEqual([
      {
        edits: [
          {
            endOffset: textDocument.text.indexOf('main = 1') - 1,
            inserted: '',
            startOffset: textDocument.text.indexOf('import Task'),
          },
        ],
        name: 'Remove unused import `Task`',
      },
    ])
    expect(invocations).toEqual([
      {
        argv: [],
        extensionId: 'builtin.language-features-elm',
        id: 'builtin.language-features-elm.elm-language-server',
        offset: 37,
        textDocument,
        uri: 'file:///extension/dist/elm-language-server.mjs',
      },
    ])
  } finally {
    sharedProcess[Symbol.dispose]()
  }
})

test('merges explicit and language server code actions from the same extension', async () => {
  const textDocument = {
    languageId: 'erlang',
    text: 'main() -> ok',
    uri: 'file:///workspace/src/main.erl',
  }
  const extensionsState = createExtensionsState([
    {
      activation: ['onCodeAction:erlang'],
      id: 'builtin.language-features-erlang',
      isolated: true,
      languageServers: [{ id: 'erlang-language-platform', languageId: 'erlang' }],
      uri: 'file:///extension',
    },
  ])
  const extensionInvocations: unknown[] = []
  const sharedProcess = SharedProcess.registerMockRpc({
    'LanguageServer.codeAction'() {
      return [
        {
          edit: {
            changes: {
              [textDocument.uri]: [
                {
                  newText: '_',
                  range: {
                    end: { character: 0, line: 0 },
                    start: { character: 0, line: 0 },
                  },
                },
              ],
            },
          },
          title: 'Ignore unused variable',
        },
      ]
    },
  })
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...params: readonly unknown[]) => {
      extensionInvocations.push([method, ...params])
      if (method === 'ExtensionApi.executeLanguageProvider') {
        return [
          {
            edits: [{ endOffset: textDocument.text.length, inserted: '.', startOffset: textDocument.text.length }],
            name: "Add missing '.'",
          },
        ]
      }
      return {
        languageServers: [
          {
            argv: ['server'],
            id: 'erlang-language-platform',
            languageId: 'erlang',
            uri: 'dist/language-server/elp',
          },
        ],
      }
    },
    invokeAndTransfer: async () => {},
    send() {},
  }
  IsolatedExtensionHostWorkerState.set('builtin.language-features-erlang', rpc)

  try {
    await expect(ExecuteLanguageProvider.executeCodeActionProviders(extensionsState, textDocument, textDocument.text.length)).resolves.toEqual([
      {
        edits: [{ endOffset: textDocument.text.length, inserted: '.', startOffset: textDocument.text.length }],
        name: "Add missing '.'",
      },
      {
        edits: [{ endOffset: 0, inserted: '_', startOffset: 0 }],
        name: 'Ignore unused variable',
      },
    ])
    expect(extensionInvocations).toEqual([
      ['ExtensionApi.executeLanguageProvider', 'code action', 'provideCodeActions', textDocument, textDocument.text.length],
      ['ExtensionApi.getLanguageServerRegistrySnapshot'],
    ])
  } finally {
    sharedProcess[Symbol.dispose]()
  }
})

test('returns no code actions when no provider matches', async () => {
  await expect(ExecuteLanguageProvider.executeCodeActionProviders(createExtensionsState([]), { languageId: 'javascript' }, 0)).resolves.toEqual([])
})

test('rejects an invalid code action provider result', async () => {
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async () => 'invalid',
    invokeAndTransfer: async () => {},
    send() {},
  }
  IsolatedExtensionHostWorkerState.set('eslint', rpc)
  const extensionsState = createExtensionsState([
    {
      activation: ['onCodeAction:javascript'],
      id: 'eslint',
      isolated: true,
    },
  ])

  await expect(ExecuteLanguageProvider.executeCodeActionProviders(extensionsState, { languageId: 'javascript' }, 0)).rejects.toThrow(
    'Code action provider result must be an array',
  )
})
