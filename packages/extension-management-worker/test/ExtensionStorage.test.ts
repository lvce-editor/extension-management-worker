import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { CacheWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as ExtensionStorage from '../src/parts/ExtensionStorage/ExtensionStorage.ts'

const state: { cacheWorker: DisposableMockRpc | undefined; sharedProcess: DisposableMockRpc | undefined } = {
  cacheWorker: undefined,
  sharedProcess: undefined,
}

beforeEach(() => {
  ExtensionsState.reset()
})

afterEach(() => {
  state.cacheWorker?.[Symbol.dispose]()
  state.cacheWorker = undefined
  state.sharedProcess?.[Symbol.dispose]()
  state.sharedProcess = undefined
})

const mockCacheWorker = (initialData?: unknown): { readonly getData: () => unknown } => {
  let data = initialData
  state.cacheWorker = CacheWorker.registerMockRpc({
    'Cache.getCacheStorageItem'() {
      if (data === undefined) {
        return null
      }
      return { body: new TextEncoder().encode(JSON.stringify(data)).buffer, headers: {}, status: 200, statusText: 'OK' }
    },
    'Cache.setCacheStorageItem'(_key: Readonly<string>, value: Readonly<ArrayBuffer>) {
      data = JSON.parse(new TextDecoder().decode(value))
      return { success: true }
    },
  })
  return {
    getData: () => data,
  }
}

test('updates disabled extension state for test platform', async () => {
  ExtensionsState.update({ disabledIds: ['existing.extension'] })

  await ExtensionStorage.disableExtension2('sample.extension', PlatformType.Test)
  expect(ExtensionsState.get().disabledIds).toEqual(['existing.extension', 'sample.extension'])

  await ExtensionStorage.enableExtension2('sample.extension', PlatformType.Test)
  expect(ExtensionsState.get().disabledIds).toEqual(['existing.extension'])
})

test('web platform creates and updates cached disabled extensions', async () => {
  const cache = mockCacheWorker()

  await ExtensionStorage.disableExtension2('sample.extension', PlatformType.Web)
  expect(cache.getData()).toEqual({ disabledExtensions: ['sample.extension'], enabledExtensions: [] })

  await ExtensionStorage.disableExtension2('other.extension', PlatformType.Web)
  expect(cache.getData()).toEqual({ disabledExtensions: ['sample.extension', 'other.extension'], enabledExtensions: [] })

  await ExtensionStorage.enableExtension2('sample.extension', PlatformType.Web)
  expect(cache.getData()).toEqual({ disabledExtensions: ['other.extension'], enabledExtensions: ['sample.extension'] })

  await ExtensionStorage.disableExtension2('sample.extension', PlatformType.Web)
  expect(cache.getData()).toEqual({ disabledExtensions: ['other.extension', 'sample.extension'], enabledExtensions: [] })
})

test('web platform handles cached data without disabled extensions', async () => {
  const cache = mockCacheWorker({})

  await ExtensionStorage.enableExtension2('sample.extension', PlatformType.Web)

  expect(cache.getData()).toEqual({ disabledExtensions: [], enabledExtensions: ['sample.extension'] })
})

test('desktop platform delegates disabling to the shared process', async () => {
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.disable'() {},
  })

  await ExtensionStorage.disableExtension2('sample.extension', PlatformType.Electron)

  expect(state.sharedProcess.invocations).toEqual([['ExtensionManagement.disable', 'sample.extension']])
})

test('desktop platform delegates enabling to the shared process', async () => {
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.enable'() {},
  })

  await ExtensionStorage.enableExtension2('sample.extension', PlatformType.Electron)

  expect(state.sharedProcess.invocations).toEqual([['ExtensionManagement.enable', 'sample.extension']])
})
