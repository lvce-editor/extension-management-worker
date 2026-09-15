import { afterEach, expect, test } from '@jest/globals'
import { getWebExtensions } from '../src/parts/GetWebExtensions/GetWebExtensions.ts'

const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch')

afterEach(() => {
  if (originalFetch) {
    Object.defineProperty(globalThis, 'fetch', originalFetch)
  } else {
    delete (globalThis as any).fetch
  }
})

test('reuses a successful manifest request', async () => {
  const cache = new Map()
  let fetchCount = 0
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (): Promise<Response> => {
      fetchCount++
      return { json: async () => [{ id: 'sample' }], ok: true } as Response
    },
  })

  await expect(getWebExtensions('/assets/reuse', cache)).resolves.toEqual([{ id: 'sample' }])
  await expect(getWebExtensions('/assets/reuse', cache)).resolves.toEqual([{ id: 'sample' }])

  expect(fetchCount).toBe(1)
})

test('shares a pending manifest request', async () => {
  const cache = new Map()
  const { promise, resolve } = Promise.withResolvers<Response>()
  let fetchCount = 0
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: (): Promise<Response> => {
      fetchCount++
      return promise
    },
  })

  const first = getWebExtensions('/assets/pending', cache)
  const second = getWebExtensions('/assets/pending', cache)
  resolve({ json: async () => [{ id: 'sample' }], ok: true } as Response)

  await expect(first).resolves.toEqual([{ id: 'sample' }])
  await expect(second).resolves.toEqual([{ id: 'sample' }])
  expect(fetchCount).toBe(1)
})

test('caches manifests by URL', async () => {
  const cache = new Map()
  const fetchedUrls: string[] = []
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (url: string): Promise<Response> => {
      fetchedUrls.push(url)
      return { json: async () => [{ id: url }], ok: true } as Response
    },
  })

  await expect(getWebExtensions('/assets/one', cache)).resolves.toEqual([{ id: '/assets/one/config/extensions.json' }])
  await expect(getWebExtensions('/assets/two', cache)).resolves.toEqual([{ id: '/assets/two/config/extensions.json' }])
  await expect(getWebExtensions('/assets/one', cache)).resolves.toEqual([{ id: '/assets/one/config/extensions.json' }])

  expect(fetchedUrls).toEqual(['/assets/one/config/extensions.json', '/assets/two/config/extensions.json'])
})

test('retries after a failed manifest request', async () => {
  const cache = new Map()
  let fetchCount = 0
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (): Promise<Response> => {
      fetchCount++
      if (fetchCount === 1) {
        throw new Error('network failure')
      }
      return { json: async () => [{ id: 'recovered' }], ok: true } as Response
    },
  })

  await expect(getWebExtensions('/assets/recovery', cache)).resolves.toEqual([])
  await expect(getWebExtensions('/assets/recovery', cache)).resolves.toEqual([{ id: 'recovered' }])
  expect(fetchCount).toBe(2)
})
