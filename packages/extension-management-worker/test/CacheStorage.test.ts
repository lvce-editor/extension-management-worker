import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { CacheWorker } from '@lvce-editor/rpc-registry'
import * as CacheStorage from '../src/parts/CacheStorage/CacheStorage.ts'

const state: { cacheWorker: DisposableMockRpc | undefined } = {
  cacheWorker: undefined,
}

afterEach(() => {
  state.cacheWorker?.[Symbol.dispose]()
  state.cacheWorker = undefined
})

test('reads JSON from cache-worker and preserves missing values', async () => {
  const body = new TextEncoder().encode('{"name":"秘密🔐"}').buffer
  state.cacheWorker = CacheWorker.registerMockRpc({
    'Cache.getCacheStorageItem'(request: string, cacheName: string) {
      expect(cacheName).toBe('Extensions')
      return request === '/missing'
        ? null
        : {
            body: request === '/string' ? '{"name":"declared string"}' : body,
            headers: { 'content-type': 'application/json' },
            status: 200,
            statusText: 'OK',
          }
    },
  })

  await expect(CacheStorage.getJson('/present')).resolves.toEqual({ name: '秘密🔐' })
  await expect(CacheStorage.getJson('/string')).resolves.toEqual({ name: 'declared string' })
  await expect(CacheStorage.getJson('/missing')).resolves.toBeUndefined()
})

test('writes JSON through cache-worker with the existing cache metadata', async () => {
  let stored: { readonly body: string; readonly cacheName: string; readonly contentType: string; readonly request: string } | undefined
  state.cacheWorker = CacheWorker.registerMockRpc({
    'Cache.setCacheStorageItem'(
      request: Readonly<string>,
      value: Readonly<ArrayBuffer>,
      cacheName: Readonly<string>,
      headers: Readonly<Record<string, string>>,
    ) {
      stored = {
        body: new TextDecoder().decode(value),
        cacheName,
        contentType: headers['content-type'] || '',
        request,
      }
      return { success: true }
    },
  })

  await CacheStorage.setJson('/extensions', { enabled: ['秘密🔐'] })

  expect(stored).toEqual({
    body: '{"enabled":["秘密🔐"]}',
    cacheName: 'Extensions',
    contentType: 'application/json',
    request: '/extensions',
  })
})

test('wraps cache-worker write failures with existing error context', async () => {
  state.cacheWorker = CacheWorker.registerMockRpc({
    'Cache.setCacheStorageItem'() {
      return { errorCode: 'CACHE_STORAGE_WRITE_FAILED', errorMessage: 'quota exceeded', success: false }
    },
  })

  await expect(CacheStorage.setJson('/extensions', {})).rejects.toThrow('Failed to add to cache')
})
