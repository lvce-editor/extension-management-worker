import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { addExtension } from '../src/parts/AddExtension/AddExtension.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as StatusBarWorker from '../src/parts/StatusBarWorker/StatusBarWorker.ts'

const state: { rendererWorker: DisposableMockRpc | undefined } = {
  rendererWorker: undefined,
}

beforeEach(() => {
  ExtensionsState.reset()
})

afterEach(() => {
  state.rendererWorker?.[Symbol.dispose]()
  state.rendererWorker = undefined
})

test('addExtension - dynamically adds extension and clears cache', async () => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'ExtensionManagement.invalidateExtensionsCache'() {},
  })
  const extension = {
    id: 'sample.extension',
    name: 'sample-extension',
    uri: 'https://example.com/extension',
  }
  ExtensionsState.update({ cachedExtensions: 'cached-value' })

  const result = await addExtension(extension)

  expect(result).toBe(extension)
  expect(ExtensionsState.get().webExtensions).toEqual([extension])
  expect(ExtensionsState.get().cachedExtensions).toBeUndefined()
  expect(state.rendererWorker.invocations).toEqual([['ExtensionManagement.invalidateExtensionsCache']])
})

test('addExtension - refreshes status bar items', async () => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'ExtensionManagement.invalidateExtensionsCache'() {},
  })
  const invocations: unknown[] = []
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...params: readonly unknown[]) => {
      invocations.push([method, ...params])
    },
    invokeAndTransfer: async () => {},
    send: () => {},
  }
  StatusBarWorker.set(rpc)

  await addExtension({
    id: 'sample.extension',
    statusBarItems: [{ text: 'Ready' }],
  })

  expect(invocations).toEqual([['StatusBar.handleChange', 'sample.extension']])
})
