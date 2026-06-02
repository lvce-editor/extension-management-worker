import type { Rpc } from '@lvce-editor/rpc'
import { afterEach, expect, test } from '@jest/globals'
import * as ExecuteHoverProvider from '../src/parts/ExecuteHoverProvider/ExecuteHoverProvider.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const createRpc = (
  result: unknown,
  error?: Error,
): {
  readonly invocations: readonly unknown[]
  readonly rpc: Rpc
} => {
  const invocations: unknown[] = []
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...params: readonly unknown[]): Promise<unknown> => {
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

afterEach(() => {
  ExtensionsState.reset()
  IsolatedExtensionHostWorkerState.clear()
})

test('executeHoverProvider asks matching isolated hover providers and returns the first result', async () => {
  const textDocument = {
    languageId: 'javascript',
    text: 'const value=1',
    uri: 'file:///test.js',
  }
  ExtensionsState.update({
    platform: 1,
    webExtensions: [
      {
        hoverProviders: [
          {
            id: 'hover.javascript.one',
            languageId: 'javascript',
          },
        ],
        id: 'extension-one',
        isolated: true,
      },
      {
        hoverProviders: [
          {
            id: 'hover.javascript.two',
            languageId: 'javascript',
          },
        ],
        id: 'extension-two',
        isolated: true,
      },
      {
        hoverProviders: [
          {
            id: 'hover.css',
            languageId: 'css',
          },
        ],
        id: 'extension-css',
        isolated: true,
      },
    ],
  })
  const firstResult = {
    documentation: 'first',
  }
  const secondResult = {
    documentation: 'second',
  }
  const firstRpc = createRpc(firstResult)
  const secondRpc = createRpc(secondResult)
  IsolatedExtensionHostWorkerState.set('extension-one', firstRpc.rpc)
  IsolatedExtensionHostWorkerState.set('extension-two', secondRpc.rpc)

  await expect(ExecuteHoverProvider.executeHoverProvider(textDocument, 4)).resolves.toEqual(firstResult)

  expect(firstRpc.invocations).toEqual([['ExtensionApi.executeHoverProvider', textDocument, 4]])
  expect(secondRpc.invocations).toEqual([['ExtensionApi.executeHoverProvider', textDocument, 4]])
})

test('executeHoverProvider returns undefined when no matching isolated hover provider exists', async () => {
  ExtensionsState.update({
    platform: 1,
    webExtensions: [
      {
        hoverProviders: [
          {
            id: 'hover.css',
            languageId: 'css',
          },
        ],
        id: 'extension-css',
        isolated: true,
      },
    ],
  })

  await expect(
    ExecuteHoverProvider.executeHoverProvider({
      languageId: 'javascript',
    }),
  ).resolves.toBeUndefined()
})

test('executeHoverProvider ignores non-isolated hover provider contributions', async () => {
  ExtensionsState.update({
    platform: 1,
    webExtensions: [
      {
        hoverProviders: [
          {
            id: 'hover.javascript',
            languageId: 'javascript',
          },
        ],
        id: 'extension-one',
        isolated: false,
      },
    ],
  })
  const rpc = createRpc({
    documentation: 'ignored',
  })
  IsolatedExtensionHostWorkerState.set('extension-one', rpc.rpc)

  await expect(
    ExecuteHoverProvider.executeHoverProvider({
      languageId: 'javascript',
    }),
  ).resolves.toBeUndefined()

  expect(rpc.invocations).toEqual([])
})

test('executeHoverProvider propagates isolated hover provider errors', async () => {
  const textDocument = {
    languageId: 'javascript',
    text: 'const value=1',
    uri: 'file:///test.js',
  }
  ExtensionsState.update({
    platform: 1,
    webExtensions: [
      {
        hoverProviders: [
          {
            id: 'hover.javascript',
            languageId: 'javascript',
          },
        ],
        id: 'extension-one',
        isolated: true,
      },
    ],
  })
  const rpc = createRpc(undefined, new Error('isolated hover failed'))
  IsolatedExtensionHostWorkerState.set('extension-one', rpc.rpc)

  await expect(ExecuteHoverProvider.executeHoverProvider(textDocument, 4)).rejects.toThrow('isolated hover failed')

  expect(rpc.invocations).toEqual([['ExtensionApi.executeHoverProvider', textDocument, 4]])
})
