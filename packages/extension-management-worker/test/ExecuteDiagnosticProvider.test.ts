import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
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

test('executeDiagnosticProvider asks matching isolated diagnostic providers and returns the first result', async () => {
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

  await expect(ExecuteDiagnosticProvider.executeDiagnosticProvider(extensionsState, textDocument)).resolves.toEqual(firstResult)

  expect(firstRpc.invocations).toEqual([['ExtensionApi.executeDiagnosticProvider', textDocument]])
  expect(secondRpc.invocations).toEqual([['ExtensionApi.executeDiagnosticProvider', textDocument]])
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

test('executeDiagnosticProvider propagates isolated diagnostic provider errors', async () => {
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
      id: 'extension-one',
      isolated: true,
    },
  ])
  const rpc = createRpc([], new Error('isolated diagnostic failed'))
  IsolatedExtensionHostWorkerState.set('extension-one', rpc.rpc)

  await expect(ExecuteDiagnosticProvider.executeDiagnosticProvider(extensionsState, textDocument)).rejects.toThrow('isolated diagnostic failed')

  expect(rpc.invocations).toEqual([['ExtensionApi.executeDiagnosticProvider', textDocument]])
})
