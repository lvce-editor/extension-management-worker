import type { Rpc } from '@lvce-editor/rpc'
import { expect, test } from '@jest/globals'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import {
  executeLanguageServerReferences,
  fromLanguageServerResult,
} from '../src/parts/ExecuteLanguageServerReferences/ExecuteLanguageServerReferences.ts'

test('fromLanguageServerResult sanitizes, normalizes, groups, and sorts locations', () => {
  const textDocument = {
    languageId: 'zig',
    text: 'const greeting = "Hello";\n_ = greeting;',
    uri: '/workspace/src/main.zig',
  }

  expect(
    fromLanguageServerResult(
      [
        {
          range: {
            end: { character: 12, line: 1 },
            start: { character: 4, line: 1 },
          },
          uri: 'file:///workspace/src/main.zig',
        },
        { uri: 'file:///workspace/src/invalid.zig' },
        {
          range: {
            end: { character: 14, line: 0 },
            start: { character: 6, line: 0 },
          },
          uri: 'file:///workspace/src/dependency.zig',
        },
        {
          range: {
            end: { character: 14, line: 0 },
            start: { character: 6, line: 0 },
          },
          uri: 'file:///workspace/src/main.zig',
        },
      ],
      textDocument,
    ),
  ).toEqual([
    {
      endColumnIndex: 14,
      endRowIndex: 0,
      startColumnIndex: 6,
      startRowIndex: 0,
      uri: textDocument.uri,
    },
    {
      endColumnIndex: 12,
      endRowIndex: 1,
      startColumnIndex: 4,
      startRowIndex: 1,
      uri: textDocument.uri,
    },
    {
      endColumnIndex: 14,
      endRowIndex: 0,
      startColumnIndex: 6,
      startRowIndex: 0,
      uri: 'file:///workspace/src/dependency.zig',
    },
  ])
})

test('fromLanguageServerResult ignores non-array results', () => {
  expect(fromLanguageServerResult(null, { languageId: 'zig' })).toEqual([])
})

test('executeLanguageServerReferences ignores incomplete documents and unmatched contributions', async () => {
  const rpc = {
    dispose: async () => {},
    invoke: async () => {
      throw new Error('unexpected invocation')
    },
    invokeAndTransfer: async () => {},
    send: () => {},
  } as Rpc
  const extension = {
    languageServers: [{ id: 'zls', languageId: 'zig' }],
    uri: 'file:///extension',
  }

  await expect(executeLanguageServerReferences(rpc, extension, { languageId: 'zig', uri: 'file:///main.zig' }, 0)).resolves.toEqual([])
  await expect(executeLanguageServerReferences(rpc, extension, { languageId: 'typescript', text: '', uri: 'file:///main.ts' }, 0)).resolves.toEqual(
    [],
  )
})

test('executeLanguageServerReferences invokes the shared process', async () => {
  const invocations: unknown[] = []
  const rendererWorker = RendererWorker.registerMockRpc({
    'Workspace.getPath'() {
      return 'file:///workspace'
    },
  })
  const sharedProcess = SharedProcess.registerMockRpc({
    'LanguageServer.references'(options: unknown) {
      invocations.push(options)
      return [
        {
          range: {
            end: { character: 14, line: 0 },
            start: { character: 6, line: 0 },
          },
          uri: 'file:///workspace/src/main.zig',
        },
      ]
    },
  })
  const rpc = {
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
    send: () => {},
  } as Rpc
  const textDocument = {
    languageId: 'zig',
    text: 'const greeting = "Hello";',
    uri: 'file:///workspace/src/main.zig',
  }

  try {
    await expect(
      executeLanguageServerReferences(
        rpc,
        {
          id: 'builtin.language-features-zig',
          languageServers: [{ id: 'zls', languageId: 'zig' }],
          uri: 'file:///extension',
        },
        textDocument,
        8,
      ),
    ).resolves.toEqual([
      {
        endColumnIndex: 14,
        endRowIndex: 0,
        startColumnIndex: 6,
        startRowIndex: 0,
        uri: textDocument.uri,
      },
    ])
    expect(invocations).toEqual([
      {
        argv: [],
        extensionId: 'builtin.language-features-zig',
        id: 'builtin.language-features-zig.zls',
        offset: 8,
        rootUri: 'file:///workspace',
        textDocument,
        uri: 'file:///extension/dist/language-server/zls.sh',
      },
    ])
  } finally {
    rendererWorker[Symbol.dispose]()
    sharedProcess[Symbol.dispose]()
  }
})
