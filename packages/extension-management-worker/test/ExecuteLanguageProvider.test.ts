import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as ExecuteLanguageProvider from '../src/parts/ExecuteLanguageProvider/ExecuteLanguageProvider.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const state: { rendererWorker: DisposableMockRpc | undefined } = {
  rendererWorker: undefined,
}

const createExtensionsState = (webExtensions: readonly any[]): ExtensionsState => ({
  activatedExtensions: Object.create(null),
  cachedActivationEvents: Object.create(null),
  cachedExtensions: undefined,
  disabledIds: [],
  platform: 1,
  runtimeStatuses: Object.create(null),
  webExtensions,
})

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

test('executes the matching isolated definition provider', async () => {
  const invocations: unknown[] = []
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...params: readonly unknown[]) => {
      invocations.push([method, ...params])
      return { uri: '/definition.ts' }
    },
    invokeAndTransfer: async () => {},
    send() {},
  }
  IsolatedExtensionHostWorkerState.set('typescript', rpc)
  const extensionsState = createExtensionsState([
    {
      activation: ['onDefinition:typescript'],
      id: 'typescript',
      isolated: true,
    },
  ])
  const textDocument = { languageId: 'typescript', text: 'value', uri: '/test.ts' }
  await expect(ExecuteLanguageProvider.executeLanguageProvider(extensionsState, 'definition', 'provideDefinition', textDocument, 2)).resolves.toEqual(
    { found: true, result: { uri: '/definition.ts' } },
  )
  expect(invocations).toEqual([['ExtensionApi.executeLanguageProvider', 'definition', 'provideDefinition', textDocument, 2]])
})

test('reports no provider when no activation event matches', async () => {
  await expect(
    ExecuteLanguageProvider.executeLanguageProvider(createExtensionsState([]), 'definition', 'provideDefinition', { languageId: 'typescript' }, 2),
  ).resolves.toEqual({ found: false })
})
