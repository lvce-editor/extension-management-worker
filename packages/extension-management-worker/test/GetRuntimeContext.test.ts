import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { getAllExtensionsWithState } from '../src/parts/GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import { getRuntimeContext } from '../src/parts/GetRuntimeContext/GetRuntimeContext.ts'

const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch')
const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')

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

test('getRuntimeContext treats static http asset dirs as web platform', async () => {
  setLocation('https:')
  state.rendererWorker = RendererWorker.registerMockRpc({
    'Layout.getAssetDir'() {
      return '/static'
    },
    'Layout.getPlatform'() {
      return PlatformType.Remote
    },
  })

  await expect(getRuntimeContext('', PlatformType.Remote)).resolves.toEqual({
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

test('getAllExtensionsWithState reads static web extensions for http static builds', async () => {
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
        ],
        ok: true,
      } as Response
    },
  })

  await expect(getAllExtensionsWithState(createExtensionsState(), '', PlatformType.Remote)).resolves.toEqual([
    {
      id: 'sample.extension',
      isWeb: true,
      path: '/static/extensions/sample.extension',
    },
  ])
})
