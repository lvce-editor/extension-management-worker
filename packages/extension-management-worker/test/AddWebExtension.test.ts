import { beforeEach, expect, jest, test } from '@jest/globals'
import { addWebExtension } from '../src/parts/AddWebExtension/AddWebExtension.ts'
import * as ExtensionMetaState from '../src/parts/ExtensionMetaState/ExtensionMetaState.ts'
import * as ExtensionsCache from '../src/parts/ExtensionsCache/ExtensionsCache.ts'

beforeEach(() => {
  jest.restoreAllMocks()
  ExtensionMetaState.clear()
  ExtensionsCache.clear()
})

test('addWebExtension - skips duplicate uri', async () => {
  ExtensionMetaState.push({ uri: 'https://example.com/extension' })
  const fetchSpy = jest.spyOn(globalThis, 'fetch')

  const result = await addWebExtension('https://example.com/extension')

  expect(result).toBe(undefined)
  expect(fetchSpy).not.toHaveBeenCalled()
  expect(ExtensionMetaState.get()).toEqual([{ uri: 'https://example.com/extension' }])
})

test('addWebExtension - adds new uri once and clears cache', async () => {
  const uri = 'https://example.com/extension'
  const manifest = {
    name: 'sample-extension',
  }
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => manifest,
  } as Response)
  ExtensionsCache.set('cached-value')

  const result = await addWebExtension(uri)

  expect(fetchSpy).toHaveBeenCalledWith(`${uri}/extension.json`)
  expect(result).toEqual({
    ...manifest,
    path: uri,
    uri,
  })
  expect(ExtensionMetaState.get()).toEqual([
    {
      ...manifest,
      path: uri,
      uri,
    },
  ])
  expect(ExtensionsCache.has()).toBe(false)
})
