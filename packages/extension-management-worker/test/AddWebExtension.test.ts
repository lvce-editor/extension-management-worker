import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { addWebExtension } from '../src/parts/AddWebExtension/AddWebExtension.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as StatusBarWorker from '../src/parts/StatusBarWorker/StatusBarWorker.ts'

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
    'ExtensionManagement.invalidateExtensionsCache'() {},
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
  expect(state.rendererWorker.invocations).toEqual([['ExtensionManagement.invalidateExtensionsCache']])
})

test('addWebExtension - refreshes status bar items using path as fallback id', async () => {
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
  const uri = 'https://example.com/status-extension'
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    json: async () => ({ statusBarItems: [{ text: 'Ready' }] }),
    ok: true,
  } as Response)

  await addWebExtension(uri)

  expect(invocations).toEqual([['StatusBar.handleChange', uri]])
})
