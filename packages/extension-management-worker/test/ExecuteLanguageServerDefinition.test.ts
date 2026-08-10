import type { Rpc } from '@lvce-editor/rpc'
import { expect, test } from '@jest/globals'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import {
  executeLanguageServerDefinition,
  fromLanguageServerResult,
} from '../src/parts/ExecuteLanguageServerDefinition/ExecuteLanguageServerDefinition.ts'

test('fromLanguageServerResult converts a same-document location to offsets', () => {
  const textDocument = {
    languageId: 'elm',
    text: 'greeting =\n    "Hello"\n\nmain = greeting',
    uri: '/workspace/src/Main.elm',
  }

  expect(
    fromLanguageServerResult(
      [
        {
          range: {
            end: { character: 8, line: 0 },
            start: { character: 0, line: 0 },
          },
          uri: 'file:///workspace/src/Main.elm',
        },
      ],
      textDocument,
    ),
  ).toEqual({
    endColumnIndex: 8,
    endOffset: 8,
    endRowIndex: 0,
    startColumnIndex: 0,
    startOffset: 0,
    startRowIndex: 0,
    uri: '/workspace/src/Main.elm',
  })
})

test('fromLanguageServerResult converts a cross-document location link', () => {
  expect(
    fromLanguageServerResult(
      {
        targetRange: {
          end: { character: 12, line: 4 },
          start: { character: 2, line: 4 },
        },
        targetSelectionRange: {
          end: { character: 9, line: 5 },
          start: { character: 1, line: 5 },
        },
        targetUri: 'file:///workspace/src/Dependency.elm',
      },
      {
        languageId: 'elm',
        text: 'main = Dependency.value',
        uri: 'file:///workspace/src/Main.elm',
      },
    ),
  ).toEqual({
    endColumnIndex: 9,
    endOffset: 0,
    endRowIndex: 5,
    startColumnIndex: 1,
    startOffset: 0,
    startRowIndex: 5,
    uri: 'file:///workspace/src/Dependency.elm',
  })
})

test('fromLanguageServerResult ignores empty and invalid locations', () => {
  const textDocument = { languageId: 'elm', text: '', uri: 'file:///workspace/src/Main.elm' }
  expect(fromLanguageServerResult(null, textDocument)).toBeUndefined()
  expect(fromLanguageServerResult([], textDocument)).toBeUndefined()
  expect(fromLanguageServerResult({ uri: 'file:///workspace/src/Main.elm' }, textDocument)).toBeUndefined()
})

test('fromLanguageServerResult converts multiline positions and clamps positions past the document', () => {
  const textDocument = {
    languageId: 'elm',
    text: 'first\nsecond\nthird',
    uri: 'file:///workspace/src/Main.elm',
  }
  expect(
    fromLanguageServerResult(
      {
        range: {
          end: { character: 4, line: 99 },
          start: { character: 2, line: 1 },
        },
        uri: textDocument.uri,
      },
      textDocument,
    ),
  ).toMatchObject({
    endOffset: textDocument.text.length,
    startOffset: 8,
  })
})

test('executeLanguageServerDefinition ignores incomplete documents and unmatched contributions', async () => {
  const rpc = {
    dispose: async () => {},
    invoke: async () => {
      throw new Error('unexpected invocation')
    },
    invokeAndTransfer: async () => {},
    send: () => {},
  } as Rpc
  const extension = {
    languageServers: [{ id: 'elm-language-server', languageId: 'elm' }],
    uri: 'file:///extension',
  }

  await expect(executeLanguageServerDefinition(rpc, extension, { languageId: 'elm', uri: 'file:///Main.elm' }, 0)).resolves.toBeUndefined()
  await expect(
    executeLanguageServerDefinition(rpc, extension, { languageId: 'typescript', text: '', uri: 'file:///Main.ts' }, 0),
  ).resolves.toBeUndefined()
})

test('executeLanguageServerDefinition invokes the shared process', async () => {
  const invocations: unknown[] = []
  const rendererWorker = RendererWorker.registerMockRpc({
    'Workspace.getPath'() {
      return 'file:///workspace'
    },
  })
  const sharedProcess = SharedProcess.registerMockRpc({
    'LanguageServer.definition'(options: unknown) {
      invocations.push(options)
      return {
        range: {
          end: { character: 8, line: 0 },
          start: { character: 0, line: 0 },
        },
        uri: 'file:///workspace/src/Main.elm',
      }
    },
  })
  const rpc = {
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
    send: () => {},
  } as Rpc
  const textDocument = {
    languageId: 'elm',
    text: 'greeting = "Hello"',
    uri: 'file:///workspace/src/Main.elm',
  }

  try {
    await expect(
      executeLanguageServerDefinition(
        rpc,
        {
          id: 'builtin.language-features-elm',
          languageServers: [{ id: 'elm-language-server', languageId: 'elm' }],
          uri: 'file:///extension',
        },
        textDocument,
        3,
      ),
    ).resolves.toMatchObject({ startOffset: 0, uri: textDocument.uri })
    expect(invocations).toEqual([
      {
        argv: [],
        extensionId: 'builtin.language-features-elm',
        id: 'builtin.language-features-elm.elm-language-server',
        offset: 3,
        rootUri: 'file:///workspace',
        textDocument,
        uri: 'file:///extension/dist/elm-language-server.mjs',
      },
    ])
  } finally {
    rendererWorker[Symbol.dispose]()
    sharedProcess[Symbol.dispose]()
  }
})
