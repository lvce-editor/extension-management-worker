import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { CacheWorker, MainProcess } from '@lvce-editor/rpc-registry'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as SecretStorage from '../src/parts/SecretStorage/SecretStorage.ts'

const state: { cacheWorker: DisposableMockRpc | undefined; mainProcess: DisposableMockRpc | undefined } = {
  cacheWorker: undefined,
  mainProcess: undefined,
}

beforeEach(() => {
  ExtensionsState.reset()
})

afterEach(() => {
  state.cacheWorker?.[Symbol.dispose]()
  state.cacheWorker = undefined
  state.mainProcess?.[Symbol.dispose]()
  state.mainProcess = undefined
})

test('electron secret storage delegates directly to the main process', async () => {
  ExtensionsState.setPlatform(PlatformType.Electron)
  state.mainProcess = MainProcess.registerMockRpc({
    'SecretStorage.delete'() {},
    'SecretStorage.get'() {
      return 'stored-value'
    },
    'SecretStorage.store'() {},
  })

  await expect(SecretStorage.getSecret('sample.extension', 'token')).resolves.toBe('stored-value')
  await SecretStorage.storeSecret('sample.extension', 'token', 'new-value')
  await SecretStorage.deleteSecret('sample.extension', 'token')

  expect(state.mainProcess.invocations).toEqual([
    ['SecretStorage.get', 'sample.extension', 'token'],
    ['SecretStorage.store', 'sample.extension', 'token', 'new-value'],
    ['SecretStorage.delete', 'sample.extension', 'token'],
  ])
})

test('web and remote secret storage uses extension-scoped cache entries', async () => {
  const values = new Map<string, string>()
  const openedCacheNames: string[] = []
  state.cacheWorker = CacheWorker.registerMockRpc({
    'Cache.getCacheStorageItem'(request: string, cacheName: string) {
      openedCacheNames.push(cacheName)
      const value = values.get(request)
      return value === undefined ? null : { body: new TextEncoder().encode(value).buffer, headers: {}, status: 200, statusText: 'OK' }
    },
    'Cache.removeCacheStorageItem'(request: string, cacheName: string) {
      openedCacheNames.push(cacheName)
      return values.delete(request)
    },
    'Cache.setCacheStorageItem'(request: Readonly<string>, value: Readonly<string> | Readonly<ArrayBuffer>, cacheName: Readonly<string>) {
      openedCacheNames.push(cacheName)
      values.set(request, typeof value === 'string' ? value : new TextDecoder().decode(value))
      return { success: true }
    },
  })

  await SecretStorage.storeSecret('sample.extension', 'api/token', 'stored-value')
  await expect(SecretStorage.getSecret('sample.extension', 'api/token')).resolves.toBe('stored-value')
  await expect(SecretStorage.getSecret('other.extension', 'api/token')).resolves.toBeUndefined()
  await SecretStorage.storeSecret('sample.extension', 'api/unicode', '秘密🔐')
  await expect(SecretStorage.getSecret('sample.extension', 'api/unicode')).resolves.toBe('秘密🔐')
  await SecretStorage.storeSecret('sample.extension', 'api/empty', '')
  await expect(SecretStorage.getSecret('sample.extension', 'api/empty')).resolves.toBe('')
  await SecretStorage.deleteSecret('sample.extension', 'api/token')
  await expect(SecretStorage.getSecret('sample.extension', 'api/token')).resolves.toBeUndefined()

  expect(openedCacheNames).toEqual(Array(9).fill(SecretStorage.cacheName))
})
