import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { CacheWorker, FileSystemWorker, RendererWorker } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { getDisabledExtensionIds } from '../src/parts/GetDisabledExtensionIds/GetDisabledExtensionIds.ts'

const state: {
  cacheWorker: DisposableMockRpc | undefined
  fileSystemWorker: DisposableMockRpc | undefined
  rendererWorker: DisposableMockRpc | undefined
} = {
  cacheWorker: undefined,
  fileSystemWorker: undefined,
  rendererWorker: undefined,
}

const createExtensionsState = (disabledIds: readonly string[] = []): ExtensionsState => {
  return {
    activatedExtensions: Object.create(null),
    cachedActivationEvents: Object.create(null),
    cachedExtensions: undefined,
    disabledIds,
    platform: PlatformType.Test,
    runtimeStatuses: Object.create(null),
    webExtensions: [],
  }
}

const mockCacheWorker = (data?: unknown): void => {
  state.cacheWorker = CacheWorker.registerMockRpc({
    'Cache.getCacheStorageItem'() {
      if (data === undefined) {
        return null
      }
      return {
        body: new TextEncoder().encode(JSON.stringify(data)).buffer,
        headers: { 'content-type': 'application/json' },
        status: 200,
        statusText: 'OK',
      }
    },
  })
}

afterEach(() => {
  state.cacheWorker?.[Symbol.dispose]()
  state.fileSystemWorker?.[Symbol.dispose]()
  state.rendererWorker?.[Symbol.dispose]()
  state.fileSystemWorker = undefined
  state.rendererWorker = undefined
})

test('returns disabled extension ids from test state', async () => {
  await expect(getDisabledExtensionIds(createExtensionsState(['sample.disabled']), PlatformType.Test)).resolves.toEqual(['sample.disabled'])
})

test('returns an empty array when the web cache is missing', async () => {
  mockCacheWorker()

  await expect(getDisabledExtensionIds(createExtensionsState(), PlatformType.Web)).resolves.toEqual([])
})

test('returns an empty array when cache storage is unavailable', async () => {
  await expect(getDisabledExtensionIds(createExtensionsState(), PlatformType.Web)).resolves.toEqual([])
})

test('returns an empty array when the web cache has no disabled extension array', async () => {
  mockCacheWorker({})

  await expect(getDisabledExtensionIds(createExtensionsState(), PlatformType.Web)).resolves.toEqual([])
})

test('returns valid disabled extension ids from the web cache', async () => {
  mockCacheWorker({
    disabledExtensions: ['sample.disabled', undefined, 1, 'other.disabled'],
  })

  await expect(getDisabledExtensionIds(createExtensionsState(), PlatformType.Web)).resolves.toEqual(['sample.disabled', 'other.disabled'])
})

test('returns an empty array when the desktop disabled extensions file is missing', async () => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'WebView.compatSharedProcessInvoke'() {
      return 'file:///config/disabled-extensions.json'
    },
  })
  state.fileSystemWorker = FileSystemWorker.registerMockRpc({
    'FileSystem.exists'() {
      return false
    },
  })

  await expect(getDisabledExtensionIds(createExtensionsState(), PlatformType.Electron)).resolves.toEqual([])
})

test('returns valid disabled extension ids from the desktop disabled extensions file', async () => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'WebView.compatSharedProcessInvoke'() {
      return 'file:///config/disabled-extensions.json'
    },
  })
  state.fileSystemWorker = FileSystemWorker.registerMockRpc({
    'FileSystem.exists'() {
      return true
    },
    'FileSystem.readFile'() {
      return JSON.stringify({
        disabledExtensions: ['sample.disabled', undefined, 1, 'other.disabled'],
      })
    },
  })

  await expect(getDisabledExtensionIds(createExtensionsState(), PlatformType.Remote)).resolves.toEqual(['sample.disabled', 'other.disabled'])
})

test('returns an empty array when reading desktop disabled extension ids fails', async () => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'WebView.compatSharedProcessInvoke'() {
      throw new Error('Failed to get disabled extensions path')
    },
  })

  await expect(getDisabledExtensionIds(createExtensionsState(), PlatformType.Electron)).resolves.toEqual([])
})
state.cacheWorker = undefined
