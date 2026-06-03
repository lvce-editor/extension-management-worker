import type { Rpc } from '@lvce-editor/rpc'
import { afterEach, expect, test } from '@jest/globals'
import type { ExtensionsState } from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as ExecuteFormattingProvider from '../src/parts/ExecuteFormattingProvider/ExecuteFormattingProvider.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const createRpc = <T>(
  result: T,
): {
  readonly invocations: readonly unknown[]
  readonly rpc: Rpc
} => {
  const invocations: unknown[] = []
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...params: readonly unknown[]): Promise<T> => {
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

afterEach(() => {
  IsolatedExtensionHostWorkerState.clear()
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

test('executeFormattingProvider reports contributed formatting provider missing from isolated extension api registry', async () => {
  const textDocument = {
    languageId: 'javascript',
    text: 'const value=1',
    uri: 'file:///test.js',
  }
  const extensionsState = createExtensionsState([
    {
      formattingProviders: [
        {
          id: 'format.javascript.missing',
          languageId: 'javascript',
        },
      ],
      id: 'extension-one',
      isolated: true,
    },
  ])
  const invocations: unknown[] = []
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...params: readonly unknown[]): Promise<unknown> => {
      invocations.push([method, ...params])
      if (method === 'ExtensionApi.getFormattingProviderRegistrySnapshot') {
        return {
          providers: [],
        }
      }
      throw new Error('No formatting provider found for javascript')
    },
    invokeAndTransfer: async (): Promise<void> => {},
    send: (): void => {},
  }
  IsolatedExtensionHostWorkerState.set('extension-one', rpc)

  await expect(ExecuteFormattingProvider.executeFormattingProvider(extensionsState, textDocument)).rejects.toThrow(
    new Error('formatting provider format.javascript.missing is contributed in extension.json but not registered'),
  )

  expect(invocations).toEqual([
    ['ExtensionApi.executeFormattingProvider', textDocument],
    ['ExtensionApi.getFormattingProviderRegistrySnapshot'],
  ])
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
