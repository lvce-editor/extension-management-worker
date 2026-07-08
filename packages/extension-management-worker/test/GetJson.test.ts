import { afterEach, expect, test } from '@jest/globals'
import { getJson } from '../src/parts/GetJson/GetJson.ts'

const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch')

afterEach(() => {
  if (originalFetch) {
    Object.defineProperty(globalThis, 'fetch', originalFetch)
  } else {
    delete (globalThis as any).fetch
  }
})

test('getJson returns json', async () => {
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (): Promise<Response> =>
      ({
        json: async () => ({ name: 'sample' }),
        ok: true,
      }) as Response,
  })

  await expect(getJson('https://example.com/extension.json')).resolves.toEqual({ name: 'sample' })
})

test('getJson uses response status text in error message', async () => {
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (): Promise<Response> =>
      ({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }) as Response,
  })

  await expect(getJson('https://example.com/missing.json')).rejects.toThrow('Failed to get json: Not Found')
})

test('getJson uses response status code when status text is empty', async () => {
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (): Promise<Response> =>
      ({
        ok: false,
        status: 404,
        statusText: '',
      }) as Response,
  })

  await expect(getJson('https://example.com/missing.json')).rejects.toThrow('Failed to get json: 404')
})
