import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as ExecuteCompletionProvider from '../src/parts/ExecuteCompletionProvider/ExecuteCompletionProvider.ts'
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

test('executeCompletionProvider asks matching isolated completion providers and returns the first result', async () => {
  const textDocument = {
    languageId: 'javascript',
    text: 'const value=1',
    uri: 'file:///test.js',
  }
  const extensionsState = createExtensionsState([
    {
      completionProviders: [
        {
          id: 'completion.javascript.one',
          languageId: 'javascript',
        },
      ],
      id: 'extension-one',
      isolated: true,
    },
    {
      completionProviders: [
        {
          id: 'completion.javascript.two',
          languageId: 'javascript',
        },
      ],
      id: 'extension-two',
      isolated: true,
    },
    {
      completionProviders: [
        {
          id: 'completion.css',
          languageId: 'css',
        },
      ],
      id: 'extension-css',
      isolated: true,
    },
  ])
  const firstResult = [
    {
      label: 'first',
      type: 1,
    },
  ]
  const secondResult = [
    {
      label: 'second',
      type: 1,
    },
  ]
  const firstRpc = createRpc(firstResult)
  const secondRpc = createRpc(secondResult)
  IsolatedExtensionHostWorkerState.set('extension-one', firstRpc.rpc)
  IsolatedExtensionHostWorkerState.set('extension-two', secondRpc.rpc)

  await expect(ExecuteCompletionProvider.executeCompletionProvider(extensionsState, textDocument, 4)).resolves.toEqual(firstResult)

  expect(firstRpc.invocations).toEqual([['ExtensionApi.executeCompletionProvider', textDocument, 4]])
  expect(secondRpc.invocations).toEqual([['ExtensionApi.executeCompletionProvider', textDocument, 4]])
})

test('executeCompletionProvider returns empty completions when no matching isolated completion provider exists', async () => {
  const extensionsState = createExtensionsState([
    {
      completionProviders: [
        {
          id: 'completion.css',
          languageId: 'css',
        },
      ],
      id: 'extension-css',
      isolated: true,
    },
  ])

  await expect(
    ExecuteCompletionProvider.executeCompletionProvider(extensionsState, {
      languageId: 'javascript',
    }),
  ).resolves.toEqual([])
})

test('executeCompletionProvider routes language server contributions through the shared process', async () => {
  const textDocument = {
    languageId: 'typescript',
    text: 'con',
    uri: 'file:///test.ts',
  }
  const extensionsState = createExtensionsState([
    {
      id: 'extension-language-server',
      isolated: true,
      languageServers: [{ id: 'typescript-native', languageId: 'typescript' }],
      uri: 'file:///test/extension',
    },
  ])
  const invocations: unknown[] = []
  const sharedProcess = SharedProcess.registerMockRpc({
    'LanguageServer.complete'(options: unknown) {
      invocations.push(options)
      return [{ kind: 6, label: 'console' }]
    },
  })
  const extensionRpc = createRpc({
    languageServers: [
      {
        argv: ['--lsp', '--stdio'],
        id: 'typescript-native',
        languageId: 'typescript',
        uri: 'server',
      },
    ],
  } as never)
  IsolatedExtensionHostWorkerState.set('extension-language-server', extensionRpc.rpc)

  await expect(ExecuteCompletionProvider.executeCompletionProvider(extensionsState, textDocument, 3)).resolves.toEqual([
    {
      flags: 0,
      kind: 6,
      label: 'console',
      matches: [],
      snippet: 'console',
    },
  ])
  expect(invocations).toHaveLength(1)
  sharedProcess[Symbol.dispose]()
})
