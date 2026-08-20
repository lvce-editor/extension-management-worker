import type { Rpc } from '@lvce-editor/rpc'
import { expect, test } from '@jest/globals'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import {
  executeLanguageServerDocumentSymbols,
  fromLanguageServerResult,
} from '../src/parts/ExecuteLanguageServerDocumentSymbols/ExecuteLanguageServerDocumentSymbols.ts'

const textDocument = {
  languageId: 'typescript',
  text: 'class App {\n  render() {}\n}',
  uri: 'file:///workspace/src/App.ts',
}

test('converts nested language server document symbols to offsets', () => {
  expect(
    fromLanguageServerResult(
      [
        {
          children: [
            {
              kind: 6,
              name: 'render',
              range: {
                end: { character: 13, line: 1 },
                start: { character: 2, line: 1 },
              },
              selectionRange: {
                end: { character: 8, line: 1 },
                start: { character: 2, line: 1 },
              },
            },
          ],
          detail: 'class App',
          kind: 5,
          name: 'App',
          range: {
            end: { character: 1, line: 2 },
            start: { character: 0, line: 0 },
          },
          selectionRange: {
            end: { character: 9, line: 0 },
            start: { character: 6, line: 0 },
          },
        },
      ],
      textDocument,
    ),
  ).toEqual([
    {
      children: [
        {
          endOffset: 25,
          kind: 6,
          name: 'render',
          selectionEndOffset: 20,
          selectionStartOffset: 14,
          startOffset: 14,
        },
      ],
      detail: 'class App',
      endOffset: textDocument.text.length,
      kind: 5,
      name: 'App',
      selectionEndOffset: 9,
      selectionStartOffset: 6,
      startOffset: 0,
    },
  ])
})

test('uses the full range when a selection range is omitted', () => {
  expect(
    fromLanguageServerResult(
      [
        {
          kind: 12,
          name: 'value',
          range: {
            end: { character: 9, line: 0 },
            start: { character: 6, line: 0 },
          },
        },
      ],
      textDocument,
    ),
  ).toEqual([
    {
      endOffset: 9,
      kind: 12,
      name: 'value',
      selectionEndOffset: 9,
      selectionStartOffset: 6,
      startOffset: 6,
    },
  ])
})

test('converts same-document SymbolInformation results', () => {
  expect(
    fromLanguageServerResult(
      [
        {
          kind: 12,
          location: {
            range: {
              end: { character: 9, line: 0 },
              start: { character: 6, line: 0 },
            },
            uri: '/workspace/src/App.ts',
          },
          name: 'App',
        },
      ],
      textDocument,
    ),
  ).toEqual([
    {
      endOffset: 9,
      kind: 12,
      name: 'App',
      selectionEndOffset: 9,
      selectionStartOffset: 6,
      startOffset: 6,
    },
  ])
})

test('ignores invalid and cross-document symbols', () => {
  expect(
    fromLanguageServerResult(
      [
        null,
        { kind: 5, name: 'MissingRange' },
        {
          kind: 5,
          location: {
            range: {
              end: { character: 3, line: 0 },
              start: { character: 0, line: 0 },
            },
            uri: 'file:///workspace/src/Other.ts',
          },
          name: 'Other',
        },
      ],
      textDocument,
    ),
  ).toEqual([])
  expect(fromLanguageServerResult(undefined, textDocument)).toEqual([])
})

test('ignores incomplete documents and unmatched language servers', async () => {
  const rpc = {
    dispose: async () => {},
    invoke: async () => {
      throw new Error('unexpected invocation')
    },
    invokeAndTransfer: async () => {},
    send: () => {},
  } as Rpc
  const extension = { languageServers: [{ id: 'tsserver', languageId: 'typescript' }], uri: 'file:///extension' }

  await expect(executeLanguageServerDocumentSymbols(rpc, extension, { languageId: 'typescript', uri: textDocument.uri })).resolves.toEqual([])
  await expect(executeLanguageServerDocumentSymbols(rpc, extension, { ...textDocument, languageId: 'javascript' })).resolves.toEqual([])
})

test('invokes the shared-process document symbol method', async () => {
  const invocations: unknown[] = []
  const rendererWorker = RendererWorker.registerMockRpc({
    'Workspace.getPath'() {
      return 'file:///workspace'
    },
  })
  const sharedProcess = SharedProcess.registerMockRpc({
    'LanguageServer.documentSymbols'(options: unknown) {
      invocations.push(options)
      return []
    },
  })
  const rpc = {
    dispose: async () => {},
    invoke: async () => ({
      languageServers: [
        {
          argv: ['--stdio'],
          id: 'typescript-language-server',
          languageId: 'typescript',
          uri: 'dist/server.js',
        },
      ],
    }),
    invokeAndTransfer: async () => {},
    send: () => {},
  } as Rpc

  try {
    await expect(
      executeLanguageServerDocumentSymbols(
        rpc,
        {
          id: 'builtin.language-features-typescript-lsp',
          languageServers: [{ id: 'typescript-language-server', languageId: 'typescript' }],
          uri: 'file:///extension',
        },
        textDocument,
      ),
    ).resolves.toEqual([])
    expect(invocations).toEqual([
      {
        argv: ['--stdio'],
        extensionId: 'builtin.language-features-typescript-lsp',
        id: 'builtin.language-features-typescript-lsp.typescript-language-server',
        rootUri: 'file:///workspace',
        textDocument,
        uri: 'file:///extension/dist/server.js',
      },
    ])
  } finally {
    rendererWorker[Symbol.dispose]()
    sharedProcess[Symbol.dispose]()
  }
})
