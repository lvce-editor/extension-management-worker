import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, jest, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { CacheWorker, FileSystemWorker, RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { getColorThemeJson } from '../src/parts/GetColorThemeJson/GetColorThemeJson.ts'
import { getColorThemeJson as getColorThemeJsonRemote } from '../src/parts/GetColorThemeJsonRemote/GetColorThemeJsonRemote.ts'

const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch')
const state: {
  cacheWorker: DisposableMockRpc | undefined
  fileSystemWorker: DisposableMockRpc | undefined
  rendererWorker: DisposableMockRpc | undefined
  sharedProcess: DisposableMockRpc | undefined
} = {
  cacheWorker: undefined,
  fileSystemWorker: undefined,
  rendererWorker: undefined,
  sharedProcess: undefined,
}

afterEach(() => {
  jest.restoreAllMocks()
  ExtensionsState.reset()
  state.fileSystemWorker?.[Symbol.dispose]()
  state.rendererWorker?.[Symbol.dispose]()
  state.sharedProcess?.[Symbol.dispose]()
  state.cacheWorker?.[Symbol.dispose]()
  state.fileSystemWorker = undefined
  state.rendererWorker = undefined
  state.sharedProcess = undefined
  state.cacheWorker = undefined
  if (originalFetch) {
    Object.defineProperty(globalThis, 'fetch', originalFetch)
  } else {
    delete (globalThis as any).fetch
  }
})

test('getColorThemeJson loads web themes from the asset directory', async () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    json: async () => ({ colors: { EditorBackground: '#000' } }),
    ok: true,
  } as Response)

  await expect(getColorThemeJson('dark', PlatformType.Web, '/assets')).resolves.toEqual({ colors: { EditorBackground: '#000' } })
  expect(fetchSpy).toHaveBeenCalledWith('/assets/extensions/builtin.theme-dark/color-theme.json')
  expect(fetchSpy).toHaveBeenNthCalledWith(1, '/assets/extensions/builtin.theme-dark/color-theme.json', { method: 'HEAD' })
})

test('web color theme JSON is reused when the ETag is unchanged', async () => {
  const cache = new Map<string, any>()
  state.cacheWorker = CacheWorker.registerMockRpc({
    'Cache.getCacheStorageItem'(key: string) {
      const value = cache.get(key)
      return value ? { body: new TextEncoder().encode(JSON.stringify(value)).buffer } : undefined
    },
    'Cache.setCacheStorageItem'(key: string, value: Readonly<ArrayBuffer>, name: string) {
      expect(name).toBe('ColorThemes')
      cache.set(key, JSON.parse(new TextDecoder().decode(value)))
      return { success: true }
    },
  })
  const responses = [
    { headers: { get: () => '"theme-v1"' }, ok: true },
    { json: async () => ({ colors: { EditorBackground: '#000' } }), ok: true },
    { headers: { get: () => '"theme-v1"' }, ok: true },
  ]
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(async () => responses.shift() as unknown as Response)

  await expect(getColorThemeJson('dark', PlatformType.Web, '/assets')).resolves.toEqual({ colors: { EditorBackground: '#000' } })
  await expect(getColorThemeJson('dark', PlatformType.Web, '/assets')).resolves.toEqual({ colors: { EditorBackground: '#000' } })
  expect(fetchSpy).toHaveBeenCalledTimes(3)
})

test('getColorThemeJson remote returns an empty object when no theme matches', async () => {
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return []
    },
  })

  await expect(getColorThemeJson('missing', PlatformType.Remote, '/assets')).resolves.toEqual({})
})

test('getColorThemeJsonRemote reads a matching contributed theme', async () => {
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [
        {
          colorThemes: [{ id: 'sample', path: 'themes/sample.json' }],
          id: 'sample.theme',
          uri: 'extensions/sample.theme',
        },
      ]
    },
  })
  state.rendererWorker = RendererWorker.registerMockRpc({
    'FileSystem.readJson'() {
      return { colors: { EditorBackground: '#123' } }
    },
    'Workspace.getPath'() {
      return 'memfs:///workspace'
    },
  })
  state.fileSystemWorker = FileSystemWorker.registerMockRpc({
    'FileSystem.exists'() {
      return false
    },
  })

  await expect(getColorThemeJsonRemote('sample', '/assets', PlatformType.Remote)).resolves.toEqual({ colors: { EditorBackground: '#123' } })
  expect(state.rendererWorker.invocations).toContainEqual(['FileSystem.readJson', 'extensions/sample.theme/themes/sample.json'])
})

test('remote color theme JSON is reused from persistent cache while file metadata is unchanged', async () => {
  const cache = new Map<string, any>()
  let readCount = 0
  state.cacheWorker = CacheWorker.registerMockRpc({
    'Cache.getCacheStorageItem'(key: string) {
      const value = cache.get(key)
      return value ? { body: new TextEncoder().encode(JSON.stringify(value)).buffer } : undefined
    },
    'Cache.setCacheStorageItem'(key: string, value: Readonly<ArrayBuffer>, name: string) {
      expect(name).toBe('ColorThemes')
      cache.set(key, JSON.parse(new TextDecoder().decode(value)))
      return { success: true }
    },
  })
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [{ colorThemes: [{ id: 'sample', path: 'themes/sample.json' }], id: 'sample.theme', uri: 'extensions/sample.theme' }]
    },
  })
  state.rendererWorker = RendererWorker.registerMockRpc({
    'FileSystem.readJson'() {
      readCount++
      return { colors: { EditorBackground: '#123' } }
    },
    'FileSystem.statWithMetadata'() {
      return { mtimeMs: 10, size: 12 }
    },
  })

  await expect(getColorThemeJsonRemote('sample', '/assets', PlatformType.Remote)).resolves.toEqual({ colors: { EditorBackground: '#123' } })
  await expect(getColorThemeJsonRemote('sample', '/assets', PlatformType.Remote)).resolves.toEqual({ colors: { EditorBackground: '#123' } })
  expect(readCount).toBe(1)
})

test('remote color theme JSON is reloaded when file metadata changes', async () => {
  const cache = new Map<string, any>()
  let mtimeMs = 10
  let readCount = 0
  state.cacheWorker = CacheWorker.registerMockRpc({
    'Cache.getCacheStorageItem'(key: string) {
      const value = cache.get(key)
      return value ? { body: new TextEncoder().encode(JSON.stringify(value)).buffer } : undefined
    },
    'Cache.setCacheStorageItem'(key: string, value: Readonly<ArrayBuffer>) {
      cache.set(key, JSON.parse(new TextDecoder().decode(value)))
      return { success: true }
    },
  })
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [{ colorThemes: [{ id: 'sample', path: 'themes/sample.json' }], id: 'sample.theme', uri: 'extensions/sample.theme' }]
    },
  })
  state.rendererWorker = RendererWorker.registerMockRpc({
    'FileSystem.readJson'() {
      readCount++
      return { colors: { EditorBackground: readCount === 1 ? '#123' : '#456' } }
    },
    'FileSystem.statWithMetadata'() {
      return { mtimeMs, size: 12 }
    },
  })

  await expect(getColorThemeJsonRemote('sample', '/assets', PlatformType.Remote)).resolves.toEqual({ colors: { EditorBackground: '#123' } })
  mtimeMs++
  await expect(getColorThemeJsonRemote('sample', '/assets', PlatformType.Remote)).resolves.toEqual({ colors: { EditorBackground: '#456' } })
  expect(readCount).toBe(2)
})

test('remote color theme JSON reload bypasses unchanged metadata cache', async () => {
  const cache = new Map<string, any>()
  let readCount = 0
  state.cacheWorker = CacheWorker.registerMockRpc({
    'Cache.getCacheStorageItem'(key: string) {
      const value = cache.get(key)
      return value ? { body: new TextEncoder().encode(JSON.stringify(value)).buffer } : undefined
    },
    'Cache.setCacheStorageItem'(key: string, value: Readonly<ArrayBuffer>) {
      cache.set(key, JSON.parse(new TextDecoder().decode(value)))
      return { success: true }
    },
  })
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [{ colorThemes: [{ id: 'sample', path: 'themes/sample.json' }], id: 'sample.theme', uri: 'extensions/sample.theme' }]
    },
  })
  state.rendererWorker = RendererWorker.registerMockRpc({
    'FileSystem.readJson'() {
      readCount++
      return { colors: { EditorBackground: readCount === 1 ? '#123' : '#456' } }
    },
    'FileSystem.statWithMetadata'() {
      return { mtimeMs: 10, size: 12 }
    },
  })

  await expect(getColorThemeJsonRemote('sample', '/assets', PlatformType.Remote)).resolves.toEqual({ colors: { EditorBackground: '#123' } })
  await expect(getColorThemeJsonRemote('sample', '/assets', PlatformType.Remote, true)).resolves.toEqual({ colors: { EditorBackground: '#456' } })
  expect(readCount).toBe(2)
})

test('remote color theme JSON loads normally when persistent cache is unavailable', async () => {
  state.cacheWorker = CacheWorker.registerMockRpc({
    'Cache.getCacheStorageItem'() {
      throw new Error('cache unavailable')
    },
    'Cache.setCacheStorageItem'() {
      throw new Error('cache unavailable')
    },
  })
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [{ colorThemes: [{ id: 'sample', path: 'themes/sample.json' }], id: 'sample.theme', uri: 'extensions/sample.theme' }]
    },
  })
  state.rendererWorker = RendererWorker.registerMockRpc({
    'FileSystem.readJson'() {
      return { colors: { EditorBackground: '#123' } }
    },
    'FileSystem.statWithMetadata'() {
      return { mtimeMs: 10, size: 12 }
    },
  })

  await expect(getColorThemeJsonRemote('sample', '/assets', PlatformType.Remote)).resolves.toEqual({ colors: { EditorBackground: '#123' } })
})
