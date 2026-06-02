import type { Rpc } from '@lvce-editor/rpc'
import { afterEach, expect, test } from '@jest/globals'
import * as ExecuteFormattingProvider from '../src/parts/ExecuteFormattingProvider/ExecuteFormattingProvider.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

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

afterEach(() => {
  ExtensionsState.reset()
  IsolatedExtensionHostWorkerState.clear()
})

test('executeFormattingProvider asks matching isolated formatting providers and returns the first result', async () => {
  const textDocument = {
    languageId: 'javascript',
    text: 'const value=1',
    uri: 'file:///test.js',
  }
  ExtensionsState.update({
    platform: 1,
    webExtensions: [
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
    ],
  })
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

  await expect(ExecuteFormattingProvider.executeFormattingProvider(textDocument)).resolves.toEqual(firstResult)

  expect(firstRpc.invocations).toEqual([['ExtensionApi.executeFormattingProvider', textDocument]])
  expect(secondRpc.invocations).toEqual([['ExtensionApi.executeFormattingProvider', textDocument]])
})

test('executeFormattingProvider returns empty edits when no matching isolated formatting provider exists', async () => {
  ExtensionsState.update({
    platform: 1,
    webExtensions: [
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
    ],
  })

  await expect(
    ExecuteFormattingProvider.executeFormattingProvider({
      languageId: 'javascript',
    }),
  ).resolves.toEqual([])
})
