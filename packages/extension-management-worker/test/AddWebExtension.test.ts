import { beforeEach, expect, jest, test } from '@jest/globals'
import { addWebExtension } from '../src/parts/AddWebExtension/AddWebExtension.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'

beforeEach(() => {
  jest.restoreAllMocks()
  ExtensionsState.reset()
})

test('addWebExtension - skips duplicate uri', async () => {
  ExtensionsState.setWebExtensions([{ uri: 'https://example.com/extension' }])
  const fetchSpy = jest.spyOn(globalThis, 'fetch')

  const result = await addWebExtension('https://example.com/extension')

  expect(result).toBe(undefined)
  expect(fetchSpy).not.toHaveBeenCalled()
  expect(ExtensionsState.get().webExtensions).toEqual([{ uri: 'https://example.com/extension' }])
})

test('addWebExtension - adds new uri once and clears cache', async () => {
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
  expect(ExtensionsState.get().cachedExtensions).toBe(undefined)
})
