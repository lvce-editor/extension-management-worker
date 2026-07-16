import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { addWebExtension } from '../src/parts/AddWebExtension/AddWebExtension.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'

const state: { rendererWorker: DisposableMockRpc | undefined } = {
  rendererWorker: undefined,
}

beforeEach(() => {
  jest.restoreAllMocks()
  ExtensionsState.reset()
})

afterEach(() => {
  state.rendererWorker?.[Symbol.dispose]()
  state.rendererWorker = undefined
})

test('addWebExtension - skips duplicate uri', async () => {
  ExtensionsState.setWebExtensions([{ uri: 'https://example.com/extension' }])
  const fetchSpy = jest.spyOn(globalThis, 'fetch')

  const result = await addWebExtension('https://example.com/extension')

  expect(result).toBeUndefined()
  expect(fetchSpy).not.toHaveBeenCalled()
  expect(ExtensionsState.get().webExtensions).toEqual([{ uri: 'https://example.com/extension' }])
})

test('addWebExtension - adds new uri once and clears cache', async () => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'ExtensionManagement.handleExtensionsCacheInvalidated'() {},
  })
  const uri = 'https://example.com/extension'
  const manifest = {
    name: 'sample-extension',
  }
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    // @ts-ignore
    json: async () => manifest,
    ok: true,
  } as Response)
  ExtensionsState.update({ cachedExtensions: 'cached-value' })

  const result = await addWebExtension(uri)

  expect(fetchSpy).toHaveBeenCalledWith(`${uri}/extension.json`)
  expect(result).toEqual({
    ...manifest,
    path: uri,
    uri,
  })
  expect(ExtensionsState.get().webExtensions).toEqual([
    {
      ...manifest,
      path: uri,
      uri,
    },
  ])
  expect(ExtensionsState.get().cachedExtensions).toBeUndefined()
  expect(state.rendererWorker.invocations).toEqual([['ExtensionManagement.handleExtensionsCacheInvalidated']])
})

test('addWebExtension - refreshes status bar items using path as fallback id', async () => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'ExtensionManagement.handleExtensionsCacheInvalidated'() {},
    'Layout.getStatusBarVisible'() {
      return true
    },
    'StatusBar.handleItemsChanged'() {},
  })
  const uri = 'https://example.com/status-extension'
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    json: async () => ({ statusBarItems: [{ text: 'Ready' }] }),
    ok: true,
  } as Response)

  await addWebExtension(uri)

  expect(state.rendererWorker.invocations).toEqual([
    ['ExtensionManagement.handleExtensionsCacheInvalidated'],
    ['Layout.getStatusBarVisible'],
    ['StatusBar.handleItemsChanged'],
  ])
})
