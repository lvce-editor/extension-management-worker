import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as ExecuteFormattingProvider from '../src/parts/ExecuteFormattingProvider/ExecuteFormattingProvider.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const state: {
  rendererWorker: DisposableMockRpc | undefined
} = {
  rendererWorker: undefined,
}

const createRpc = (
  result: readonly unknown[],
): {
  readonly invocations: readonly unknown[]
  readonly rpc: Rpc
} => {
  const invocations: unknown[] = []
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...params: readonly unknown[]): Promise<readonly unknown[]> => {
      invocations.push([method, ...params])
      return result
    },
    invokeAndTransfer: async (): Promise<void> => {},
    send: (): void => {},
  }
  return {
    invocations,
    rpc,
  }
}

const createExtensionsState = (webExtensions: readonly any[]): ExtensionsState => {
  return {
    activatedExtensions: Object.create(null),
    cachedActivationEvents: Object.create(null),
    cachedExtensions: undefined,
    disabledIds: [],
    platform: 1,
    runtimeStatuses: Object.create(null),
    webExtensions,
  }
}

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

test('executeFormattingProvider asks matching isolated formatting providers and returns the first result', async () => {
  const textDocument = {
    languageId: 'javascript',
    text: 'const value=1',
    uri: 'file:///test.js',
  }
  const extensionsState = createExtensionsState([
    {
      formattingProviders: [
        {
          id: 'format.javascript.one',
          languageId: 'javascript',
        },
      ],
      id: 'extension-one',
      isolated: true,
    },
    {
      formattingProviders: [
        {
          id: 'format.javascript.two',
          languageId: 'javascript',
        },
      ],
      id: 'extension-two',
      isolated: true,
    },
    {
      formattingProviders: [
        {
          id: 'format.css',
          languageId: 'css',
        },
      ],
      id: 'extension-css',
      isolated: true,
    },
  ])
  const firstResult = [
    {
      endOffset: 13,
      inserted: 'const value = 1',
      startOffset: 0,
    },
  ]
  const secondResult = [
    {
      endOffset: 13,
      inserted: 'const other = 1',
      startOffset: 0,
    },
  ]
  const firstRpc = createRpc(firstResult)
  const secondRpc = createRpc(secondResult)
  IsolatedExtensionHostWorkerState.set('extension-one', firstRpc.rpc)
  IsolatedExtensionHostWorkerState.set('extension-two', secondRpc.rpc)

  await expect(ExecuteFormattingProvider.executeFormattingProvider(extensionsState, textDocument)).resolves.toEqual(firstResult)

  expect(firstRpc.invocations).toEqual([['ExtensionApi.executeFormattingProvider', textDocument]])
  expect(secondRpc.invocations).toEqual([['ExtensionApi.executeFormattingProvider', textDocument]])
})

test('executeFormattingProvider returns empty edits when no matching isolated formatting provider exists', async () => {
  const extensionsState = createExtensionsState([
    {
      formattingProviders: [
        {
          id: 'format.css',
          languageId: 'css',
        },
      ],
      id: 'extension-css',
      isolated: true,
    },
  ])

  await expect(
    ExecuteFormattingProvider.executeFormattingProvider(extensionsState, {
      languageId: 'javascript',
    }),
  ).resolves.toEqual([])
})

test('executeFormattingProvider ignores disabled formatting provider contributions', async () => {
  const textDocument = {
    languageId: 'javascript',
  }
  const extensionsState = createExtensionsState([
    {
      disabled: true,
      formattingProviders: [
        {
          id: 'format.javascript',
          languageId: 'javascript',
        },
      ],
      id: 'extension-javascript',
      isolated: true,
    },
  ])
  const rpc = createRpc([{ inserted: 'ignored' }])
  IsolatedExtensionHostWorkerState.set('extension-javascript', rpc.rpc)

  await expect(ExecuteFormattingProvider.executeFormattingProvider(extensionsState, textDocument)).resolves.toEqual([])

  expect(rpc.invocations).toEqual([])
})

test('executeFormattingProvider routes language server contributions through the shared process', async () => {
  const textDocument = {
    languageId: 'elm',
    text: 'module Main exposing ( main )\r\nmain=1',
    uri: 'file:///workspace/src/Main.elm',
  }
  const extensionsState = createExtensionsState([
    {
      id: 'builtin.language-features-elm',
      isolated: true,
      languageServers: [{ id: 'elm-language-server', languageId: 'elm' }],
      uri: 'file:///extensions/language-features-elm',
    },
  ])
  const invocations: unknown[] = []
  const sharedProcess = SharedProcess.registerMockRpc({
    'LanguageServer.format'(options: unknown) {
      invocations.push(options)
      return [
        {
          newText: 'module Main exposing (main)\n\nmain =\n    1\n',
          range: {
            end: { character: 6, line: 1 },
            start: { character: 0, line: 0 },
          },
        },
      ]
    },
  })
  const extensionRpc = createRpc({
    languageServers: [
      {
        argv: [],
        id: 'elm-language-server',
        languageId: 'elm',
        uri: 'dist/language-server/elm-language-server.mjs',
      },
    ],
  } as never)
  IsolatedExtensionHostWorkerState.set('builtin.language-features-elm', extensionRpc.rpc)

  await expect(ExecuteFormattingProvider.executeFormattingProvider(extensionsState, textDocument)).resolves.toEqual([
    {
      endOffset: textDocument.text.length,
      inserted: 'module Main exposing (main)\n\nmain =\n    1\n',
      startOffset: 0,
    },
  ])
  expect(invocations).toHaveLength(1)
  sharedProcess[Symbol.dispose]()
})
