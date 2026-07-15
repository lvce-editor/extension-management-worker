import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { addExtension } from '../src/parts/AddExtension/AddExtension.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'

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
    'ExtensionManagement.handleExtensionsCacheInvalidated'() {},
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
  expect(state.rendererWorker.invocations).toEqual([['ExtensionManagement.handleExtensionsCacheInvalidated']])
})

test('addExtension - refreshes status bar items', async () => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'ExtensionManagement.handleExtensionsCacheInvalidated'() {},
    'StatusBar.handleItemsChanged'() {},
  })

  await addExtension({
    id: 'sample.extension',
    statusBarItems: [{ text: 'Ready' }],
  })

  expect(state.rendererWorker.invocations).toEqual([['ExtensionManagement.handleExtensionsCacheInvalidated'], ['StatusBar.handleItemsChanged']])
})
