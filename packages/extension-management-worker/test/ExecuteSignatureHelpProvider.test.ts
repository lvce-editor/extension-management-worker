import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as ExecuteSignatureHelpProvider from '../src/parts/ExecuteSignatureHelpProvider/ExecuteSignatureHelpProvider.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const state: {
  rendererWorker: DisposableMockRpc | undefined
} = {
  rendererWorker: undefined,
}

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

test('executeSignatureHelpProvider asks matching isolated providers and returns the first result', async () => {
  const textDocument = {
    languageId: 'typescript',
    text: 'fn(',
    uri: 'file:///test.ts',
  }
  const extensionsState = createExtensionsState([
    {
      id: 'extension-one',
      isolated: true,
      signatureHelpProviders: [{ id: 'signature-help.typescript.one', languageId: 'typescript' }],
    },
    {
      id: 'extension-two',
      isolated: true,
      signatureHelpProviders: [{ id: 'signature-help.typescript.two', languageId: 'typescript' }],
    },
    {
      id: 'extension-css',
      isolated: true,
      signatureHelpProviders: [{ id: 'signature-help.css', languageId: 'css' }],
    },
  ])
  const firstResult = {
    activeParameter: 0,
    activeSignature: 0,
    signatures: [{ label: 'fn(value: string): void', parameters: [{ label: 'value: string' }] }],
  }
  const firstRpc = createRpc(firstResult)
  const secondRpc = createRpc(undefined)
  IsolatedExtensionHostWorkerState.set('extension-one', firstRpc.rpc)
  IsolatedExtensionHostWorkerState.set('extension-two', secondRpc.rpc)

  await expect(ExecuteSignatureHelpProvider.executeSignatureHelpProvider(extensionsState, textDocument, 3)).resolves.toEqual(firstResult)

  expect(firstRpc.invocations).toEqual([['ExtensionApi.executeSignatureHelpProvider', textDocument, 3]])
  expect(secondRpc.invocations).toEqual([['ExtensionApi.executeSignatureHelpProvider', textDocument, 3]])
})

test('executeSignatureHelpProvider returns undefined when no matching provider exists', async () => {
  const extensionsState = createExtensionsState([
    {
      id: 'extension-css',
      isolated: true,
      signatureHelpProviders: [{ id: 'signature-help.css', languageId: 'css' }],
    },
  ])

  await expect(
    ExecuteSignatureHelpProvider.executeSignatureHelpProvider(extensionsState, {
      languageId: 'typescript',
    }),
  ).resolves.toBeUndefined()
})

test('executeSignatureHelpProvider ignores disabled providers', async () => {
  const textDocument = {
    languageId: 'typescript',
  }
  const extensionsState = createExtensionsState([
    {
      disabled: true,
      id: 'extension-typescript',
      isolated: true,
      signatureHelpProviders: [{ id: 'signature-help.typescript', languageId: 'typescript' }],
    },
  ])
  const rpc = createRpc(undefined)
  IsolatedExtensionHostWorkerState.set('extension-typescript', rpc.rpc)

  await expect(ExecuteSignatureHelpProvider.executeSignatureHelpProvider(extensionsState, textDocument)).resolves.toBeUndefined()
  expect(rpc.invocations).toEqual([])
})

test('executeSignatureHelpProvider ignores non-isolated providers', async () => {
  const extensionsState = createExtensionsState([
    {
      id: 'extension-typescript',
      isolated: false,
      signatureHelpProviders: [{ id: 'signature-help.typescript', languageId: 'typescript' }],
    },
  ])

  await expect(
    ExecuteSignatureHelpProvider.executeSignatureHelpProvider(extensionsState, {
      languageId: 'typescript',
    }),
  ).resolves.toBeUndefined()
})

test('executeSignatureHelpProvider propagates isolated provider errors', async () => {
  const textDocument = {
    languageId: 'typescript',
    text: 'fn(',
    uri: 'file:///test.ts',
  }
  const extensionsState = createExtensionsState([
    {
      id: 'extension-typescript',
      isolated: true,
      signatureHelpProviders: [{ id: 'signature-help.typescript', languageId: 'typescript' }],
    },
  ])
  const rpc = createRpc(undefined, new Error('isolated signature help failed'))
  IsolatedExtensionHostWorkerState.set('extension-typescript', rpc.rpc)

  await expect(ExecuteSignatureHelpProvider.executeSignatureHelpProvider(extensionsState, textDocument, 3)).rejects.toThrow(
    'isolated signature help failed',
  )
  expect(rpc.invocations).toEqual([['ExtensionApi.executeSignatureHelpProvider', textDocument, 3]])
})
