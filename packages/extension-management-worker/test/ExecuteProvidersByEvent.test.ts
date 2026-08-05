import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { executeProvidersByEvent } from '../src/parts/ExecuteProvidersByEvent/ExecuteProvidersByEvent.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const createExtensionsState = (webExtensions: readonly any[]): ExtensionsState => ({
  activatedExtensions: Object.create(null),
  cachedActivationEvents: Object.create(null),
  cachedExtensions: undefined,
  disabledIds: [],
  platform: 1,
  runtimeStatuses: Object.create(null),
  webExtensions,
})

const testState: { rendererWorker: DisposableMockRpc | undefined } = {
  rendererWorker: undefined,
}

beforeEach(() => {
  testState.rendererWorker = RendererWorker.registerMockRpc({
    'Layout.getAssetDir'() {
      return '/assets'
    },
  })
})

afterEach(() => {
  IsolatedExtensionHostWorkerState.clear()
  testState.rendererWorker?.[Symbol.dispose]()
  testState.rendererWorker = undefined
})

test('invokes every isolated extension matching the activation event', async () => {
  const invocations: unknown[] = []
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...params: readonly unknown[]) => {
      invocations.push([method, ...params])
      return 'result'
    },
    invokeAndTransfer: async () => {},
    send() {},
  }
  IsolatedExtensionHostWorkerState.set('sample-extension', rpc)
  const state = createExtensionsState([
    { activation: ['onDebug:node'], id: 'sample-extension', isolated: true },
    { activation: ['onDebug:other'], id: 'other-extension', isolated: true },
    { activation: ['onDebug:node'], disabled: true, id: 'disabled-extension', isolated: true },
    { activation: ['onDebug:node'], id: 'legacy-extension' },
  ])

  await expect(executeProvidersByEvent(state, 'onDebug:node', 'Debug.resume', 'node')).resolves.toEqual(['result'])
  expect(invocations).toEqual([['Debug.resume', 'node']])
})

test('returns an empty array when no isolated extension matches', async () => {
  const state = createExtensionsState([{ activation: ['onDebug:other'], id: 'sample-extension', isolated: true }])
  await expect(executeProvidersByEvent(state, 'onDebug:node', 'Debug.resume', 'node')).resolves.toEqual([])
})
