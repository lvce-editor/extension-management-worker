import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { getAllExtensionsWithState } from '../src/parts/GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import { getRuntimeContext } from '../src/parts/GetRuntimeContext/GetRuntimeContext.ts'

const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch')
const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')
const originalCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches')

const state: {
  rendererWorker: DisposableMockRpc | undefined
  sharedProcess: DisposableMockRpc | undefined
} = {
  rendererWorker: undefined,
  sharedProcess: undefined,
}

const createExtensionsState = (): ExtensionsState => {
  return {
    activatedExtensions: Object.create(null),
    cachedActivationEvents: Object.create(null),
    cachedExtensions: undefined,
    disabledIds: [],
    platform: PlatformType.Remote,
    runtimeStatuses: Object.create(null),
    webExtensions: [],
  }
}

const setLocation = (protocol: string): void => {
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: {
      origin: 'https://example.test',
      protocol,
    },
  })
}

const restoreLocation = (): void => {
  if (originalLocation) {
    Object.defineProperty(globalThis, 'location', originalLocation)
    return
  }
  delete (globalThis as any).location
}

afterEach(() => {
  state.rendererWorker?.[Symbol.dispose]()
  state.sharedProcess?.[Symbol.dispose]()
  state.rendererWorker = undefined
  state.sharedProcess = undefined
  if (originalFetch) {
    Object.defineProperty(globalThis, 'fetch', originalFetch)
  } else {
    delete (globalThis as any).fetch
  }
  if (originalCaches) {
    Object.defineProperty(globalThis, 'caches', originalCaches)
  } else {
    delete (globalThis as any).caches
  }
  restoreLocation()
})

test('getRuntimeContext resolves empty assetDir and missing platform from renderer worker', async () => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'Layout.getAssetDir'() {
      return '/static'
    },
    'Layout.getPlatform'() {
      return PlatformType.Remote
    },
  })

  await expect(getRuntimeContext('', 0)).resolves.toEqual({
    assetDir: '/static',
    platform: PlatformType.Remote,
  })

  expect(state.rendererWorker.invocations).toEqual([['Layout.getAssetDir'], ['Layout.getPlatform']])
})

test('getRuntimeContext preserves an explicit remote platform for static http asset dirs', async () => {
  setLocation('https:')
  state.rendererWorker = RendererWorker.registerMockRpc({
    'Layout.getAssetDir'() {
      return '/static'
    },
  })

  await expect(getRuntimeContext('', PlatformType.Remote)).resolves.toEqual({
    assetDir: '/static',
    platform: PlatformType.Remote,
  })
})

test('getRuntimeContext infers web platform for static http asset dirs', async () => {
  setLocation('https:')
  state.rendererWorker = RendererWorker.registerMockRpc({
    'Layout.getAssetDir'() {
      return '/static'
    },
    'Layout.getPlatform'() {
      return PlatformType.Remote
    },
  })

  await expect(getRuntimeContext('', 0)).resolves.toEqual({
    assetDir: '/static',
    platform: PlatformType.Web,
  })
})

test('getRuntimeContext preserves remote platform outside http static builds', async () => {
  setLocation('file:')

  await expect(getRuntimeContext('/static', PlatformType.Remote)).resolves.toEqual({
    assetDir: '/static',
    platform: PlatformType.Remote,
  })
})

test('getRuntimeContext preserves an explicit remote platform for absolute http asset urls', async () => {
  setLocation('https:')

  await expect(getRuntimeContext('https://cdn.example.com/assets', PlatformType.Remote)).resolves.toEqual({
    assetDir: 'https://cdn.example.com/assets',
    platform: PlatformType.Remote,
  })
})

test('getAllExtensionsWithState reads static web extensions for the web platform', async () => {
  setLocation('https:')
  state.rendererWorker = RendererWorker.registerMockRpc({
    'Layout.getAssetDir'() {
      return '/static'
    },
  })
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      throw new Error('Expected static build to use web extensions')
    },
  })
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (url: string): Promise<Response> => {
      expect(url).toBe('/static/config/extensions.json')
      return {
        json: async () => [
          {
            id: 'sample.extension',
            isWeb: true,
            path: '/static/extensions/sample.extension',
          },
          {
            compatibility: {
              web: false,
            },
            id: 'sample.incompatible-extension',
            isWeb: true,
            path: '/static/extensions/sample.incompatible-extension',
          },
        ],
        ok: true,
      } as Response
    },
  })

  await expect(getAllExtensionsWithState(createExtensionsState(), '', PlatformType.Web)).resolves.toEqual([
    {
      id: 'sample.extension',
      isWeb: true,
      path: '/static/extensions/sample.extension',
    },
  ])
})

test('getAllExtensionsWithState applies an explicit web enable to an extension disabled by default', async () => {
  setLocation('https:')
  Object.defineProperties(globalThis, {
    caches: {
      configurable: true,
      value: {
        async match(): Promise<Response> {
          return {
            json: async () => ({ enabledExtensions: ['builtin.gpt-voice'] }),
          } as Response
        },
      },
    },
    fetch: {
      configurable: true,
      value: async (): Promise<Response> => {
        return {
          json: async () => [
            {
              disabled: true,
              id: 'builtin.gpt-voice',
              isWeb: true,
              path: '/static/extensions/builtin.gpt-voice',
            },
          ],
          ok: true,
        } as Response
      },
    },
  })

  await expect(getAllExtensionsWithState(createExtensionsState(), '/static', PlatformType.Web)).resolves.toEqual([
    {
      disabled: false,
      id: 'builtin.gpt-voice',
      isWeb: true,
      path: '/static/extensions/builtin.gpt-voice',
    },
  ])
})

test('getAllExtensionsWithState reads remote extensions when served over http', async () => {
  setLocation('https:')
  state.rendererWorker = RendererWorker.registerMockRpc({
    'Layout.getAssetDir'() {
      return '/static'
    },
  })
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [
        {
          compatibility: {
            web: false,
          },
          id: 'sample.remote-extension',
          isolated: true,
          path: '/extensions/sample.remote-extension',
        },
      ]
    },
  })
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: (): never => {
      throw new Error('Expected remote runtime to use shared process extensions')
    },
  })

  await expect(getAllExtensionsWithState(createExtensionsState(), '', PlatformType.Remote)).resolves.toEqual([
    {
      compatibility: {
        web: false,
      },
      id: 'sample.remote-extension',
      isolated: true,
      path: '/extensions/sample.remote-extension',
    },
  ])
})
