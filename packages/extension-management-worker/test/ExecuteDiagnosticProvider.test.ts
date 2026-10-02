import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as ExecuteDiagnosticProvider from '../src/parts/ExecuteDiagnosticProvider/ExecuteDiagnosticProvider.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const state: {
  rendererWorker: DisposableMockRpc | undefined
} = {
  rendererWorker: undefined,
}

const createRpc = (
  result: readonly unknown[],
  error?: Error,
): {
  readonly invocations: readonly unknown[]
  readonly rpc: Rpc
} => {
  const invocations: unknown[] = []
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...params: readonly unknown[]): Promise<readonly unknown[]> => {
      invocations.push([method, ...params])
      if (error) {
        throw error
      }
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

test('executeDiagnosticProvider asks matching isolated diagnostic providers and merges their results', async () => {
  const textDocument = {
    languageId: 'javascript',
    text: 'const value=1',
    uri: 'file:///test.js',
  }
  const extensionsState = createExtensionsState([
    {
      diagnosticProviders: [
        {
          id: 'diagnostic.javascript.one',
          languageId: 'javascript',
        },
      ],
      id: 'extension-one',
      isolated: true,
    },
    {
      diagnosticProviders: [
        {
          id: 'diagnostic.javascript.two',
          languageId: 'javascript',
        },
      ],
      id: 'extension-two',
      isolated: true,
    },
    {
      diagnosticProviders: [
        {
          id: 'diagnostic.css',
          languageId: 'css',
        },
      ],
      id: 'extension-css',
      isolated: true,
    },
  ])
  const firstResult = [
    {
      columnIndex: 0,
      endColumnIndex: 5,
      endRowIndex: 0,
      message: 'first',
      rowIndex: 0,
      type: 'error',
    },
  ]
  const secondResult = [
    {
      columnIndex: 0,
      endColumnIndex: 5,
      endRowIndex: 0,
      message: 'second',
      rowIndex: 0,
      type: 'warning',
    },
  ]
  const firstRpc = createRpc(firstResult)
  const secondRpc = createRpc(secondResult)
  IsolatedExtensionHostWorkerState.set('extension-one', firstRpc.rpc)
  IsolatedExtensionHostWorkerState.set('extension-two', secondRpc.rpc)

  await expect(ExecuteDiagnosticProvider.executeDiagnosticProvider(extensionsState, textDocument)).resolves.toEqual([...firstResult, ...secondResult])

  expect(firstRpc.invocations).toEqual([['ExtensionApi.executeDiagnosticProvider', textDocument]])
  expect(secondRpc.invocations).toEqual([['ExtensionApi.executeDiagnosticProvider', textDocument]])
})

test('streamDiagnosticProvider delivers each provider result before slower providers finish', async () => {
  const textDocument = {
    languageId: 'javascript',
    text: 'const value=1',
    uri: 'file:///test.js',
  }
  const extensionsState = createExtensionsState([
    {
      diagnosticProviders: [{ languageId: 'javascript' }],
      id: 'fast-provider',
      isolated: true,
    },
    {
      diagnosticProviders: [{ languageId: 'javascript' }],
      id: 'slow-provider',
      isolated: true,
    },
  ])
  const fastResult = [{ message: 'fast', uri: textDocument.uri }]
  const slowResult = [{ message: 'slow', uri: textDocument.uri }]
  const fastRpc = createRpc(fastResult)
  const { promise: slowProviderPromise, resolve: resolveSlowProvider } = Promise.withResolvers<readonly unknown[]>()
  const slowRpc: Rpc = {
    ...createRpc([]).rpc,
    invoke: async (): Promise<readonly unknown[]> => {
      return slowProviderPromise
    },
  }
  IsolatedExtensionHostWorkerState.set('fast-provider', fastRpc.rpc)
  IsolatedExtensionHostWorkerState.set('slow-provider', slowRpc)
  const channel = new MessageChannel()
  const receivedMessages: {
    readonly diagnostics?: readonly unknown[]
    readonly providerId?: string
    readonly providerIndex?: number
    readonly type?: string
  }[] = []
  const firstResult = Promise.withResolvers<void>()
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- MessagePort provides a DOM event.
  channel.port1.onmessage = (event: MessageEvent<(typeof receivedMessages)[number]>): void => {
    receivedMessages.push(event.data)
    if (event.data.type === 'result' && event.data.providerId === 'fast-provider') {
      firstResult.resolve()
    }
  }
  channel.port1.start()

  const completion = ExecuteDiagnosticProvider.streamDiagnosticProvider(extensionsState, textDocument, channel.port2)
  await firstResult.promise

  expect(receivedMessages).toContainEqual({
    diagnostics: fastResult,
    providerId: 'fast-provider',
    providerIndex: 0,
    type: 'result',
  })
  expect(receivedMessages).not.toContainEqual({ type: 'done' })

  resolveSlowProvider(slowResult)
  await completion
  await new Promise<void>((resolve) => {
    channel.port1.addEventListener('message', () => {
      if (receivedMessages.some((message) => message.type === 'done')) {
        resolve()
      }
    })
    if (receivedMessages.some((message) => message.type === 'done')) {
      resolve()
    }
  })

  expect(receivedMessages).toContainEqual({
    diagnostics: slowResult,
    providerId: 'slow-provider',
    providerIndex: 1,
    type: 'result',
  })
  expect(receivedMessages.at(-1)).toEqual({ type: 'done' })
  channel.port1.close()
})

test('executeDiagnosticProvider returns empty diagnostics when no matching isolated diagnostic provider exists', async () => {
  const extensionsState = createExtensionsState([
    {
      diagnosticProviders: [
        {
          id: 'diagnostic.css',
          languageId: 'css',
        },
      ],
      id: 'extension-css',
      isolated: true,
    },
  ])

  await expect(
    ExecuteDiagnosticProvider.executeDiagnosticProvider(extensionsState, {
      languageId: 'javascript',
    }),
  ).resolves.toEqual([])
})

test('executeDiagnosticProvider ignores disabled language server contributions', async () => {
  const textDocument = {
    languageId: 'typescript',
    text: 'const value: string = 1',
    uri: 'file:///test.ts',
  }
  const extensionsState = createExtensionsState([
    {
      disabled: true,
      id: 'extension-typescript',
      isolated: true,
      languageServers: [{ id: 'typescript-native', languageId: 'typescript' }],
    },
  ])
  const rpc = createRpc([])
  IsolatedExtensionHostWorkerState.set('extension-typescript', rpc.rpc)

  await expect(ExecuteDiagnosticProvider.executeDiagnosticProvider(extensionsState, textDocument)).resolves.toEqual([])

  expect(rpc.invocations).toEqual([])
})

test('executeDiagnosticProvider routes language server contributions through the shared process', async () => {
  const textDocument = {
    languageId: 'markdown',
    text: '[missing][reference]',
    uri: 'file:///README.md',
  }
  const extensionsState = createExtensionsState([
    {
      id: 'extension-language-server',
      isolated: true,
      languageServers: [{ id: 'vscode-markdown', languageId: 'markdown' }],
      uri: 'file:///test/extension',
    },
  ])
  const sharedProcess = SharedProcess.registerMockRpc({
    'LanguageServer.diagnostic'() {
      return [
        {
          message: "No link definition found: 'reference'",
          range: {
            end: { character: 20, line: 0 },
            start: { character: 10, line: 0 },
          },
          severity: 2,
        },
      ]
    },
  })
  const extensionRpc = createRpc({
    languageServers: [
      {
        argv: ['--stdio'],
        id: 'vscode-markdown',
        languageId: 'markdown',
        uri: 'server',
      },
    ],
  } as never)
  IsolatedExtensionHostWorkerState.set('extension-language-server', extensionRpc.rpc)

  await expect(ExecuteDiagnosticProvider.executeDiagnosticProvider(extensionsState, textDocument)).resolves.toEqual([
    {
      columnIndex: 10,
      endColumnIndex: 20,
      endRowIndex: 0,
      message: "No link definition found: 'reference'",
      rowIndex: 0,
      type: 'warning',
    },
  ])
  sharedProcess[Symbol.dispose]()
})

test('executeDiagnosticProvider ignores non-isolated diagnostic provider contributions', async () => {
  const extensionsState = createExtensionsState([
    {
      diagnosticProviders: [
        {
          id: 'diagnostic.javascript',
          languageId: 'javascript',
        },
      ],
      id: 'extension-one',
      isolated: false,
    },
  ])
  const rpc = createRpc([
    {
      message: 'ignored',
    },
  ])
  IsolatedExtensionHostWorkerState.set('extension-one', rpc.rpc)

  await expect(
    ExecuteDiagnosticProvider.executeDiagnosticProvider(extensionsState, {
      languageId: 'javascript',
    }),
  ).resolves.toEqual([])

  expect(rpc.invocations).toEqual([])
})

test('executeDiagnosticProvider continues when one isolated diagnostic provider fails', async () => {
  const textDocument = {
    languageId: 'javascript',
    text: 'const value=1',
    uri: 'file:///test.js',
  }
  const extensionsState = createExtensionsState([
    {
      diagnosticProviders: [
        {
          id: 'diagnostic.javascript',
          languageId: 'javascript',
        },
      ],
      id: 'extension-failing',
      isolated: true,
    },
    {
      diagnosticProviders: [
        {
          id: 'diagnostic.javascript.working',
          languageId: 'javascript',
        },
      ],
      id: 'extension-working',
      isolated: true,
    },
  ])
  const failingRpc = createRpc([], new Error('isolated diagnostic failed'))
  const workingResult = [
    {
      columnIndex: 0,
      endColumnIndex: 8,
      endRowIndex: 0,
      message: "Unexpected 'debugger' statement.",
      rowIndex: 0,
      type: 'warning',
    },
  ]
  const workingRpc = createRpc(workingResult)
  IsolatedExtensionHostWorkerState.set('extension-failing', failingRpc.rpc)
  IsolatedExtensionHostWorkerState.set('extension-working', workingRpc.rpc)

  await expect(ExecuteDiagnosticProvider.executeDiagnosticProvider(extensionsState, textDocument)).resolves.toEqual(workingResult)

  expect(failingRpc.invocations).toEqual([['ExtensionApi.executeDiagnosticProvider', textDocument]])
  expect(workingRpc.invocations).toEqual([['ExtensionApi.executeDiagnosticProvider', textDocument]])
})

test('streamDiagnosticProvider distinguishes a failed provider from a successful empty result', async () => {
  const extensionsState = createExtensionsState([
    { diagnosticProviders: [{ languageId: 'javascript' }], id: 'failed', isolated: true },
    { diagnosticProviders: [{ languageId: 'javascript' }], id: 'empty', isolated: true },
  ])
  IsolatedExtensionHostWorkerState.set('failed', createRpc([], new Error('provider unavailable')).rpc)
  IsolatedExtensionHostWorkerState.set('empty', createRpc([]).rpc)
  const messages: unknown[] = []
  await ExecuteDiagnosticProvider.streamDiagnosticProvider(
    extensionsState,
    { languageId: 'javascript' },
    {
      postMessage(message: unknown): void {
        messages.push(message)
      },
    },
  )
  expect(messages).toContainEqual({ diagnostics: [], error: 'provider unavailable', providerId: 'failed', providerIndex: 0, type: 'result' })
  expect(messages).toContainEqual({ diagnostics: [], providerId: 'empty', providerIndex: 1, type: 'result' })
  expect(messages.at(-1)).toEqual({ type: 'done' })
})
