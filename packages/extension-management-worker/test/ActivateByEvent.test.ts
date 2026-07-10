import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import { activateByEvent } from '../src/parts/ActivateByEvent/ActivateByEvent.ts'

const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch')
const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')

const state: {
  rendererWorker: DisposableMockRpc | undefined
  sharedProcess: DisposableMockRpc | undefined
} = {
  rendererWorker: undefined,
  sharedProcess: undefined,
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
  if (originalLocation) {
    Object.defineProperty(globalThis, 'location', originalLocation)
  } else {
    delete (globalThis as any).location
  }
})

test('activateByEvent returns hasActivatedExtensions false when no extensions match', async () => {
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [
        {
          activation: ['onCommand:other'],
          id: 'sample.extension-one',
          isolated: true,
        },
      ]
    },
  })

  const result = await activateByEvent('onCommand:test', '/assets', 2)

  expect(result).toEqual({
    error: undefined,
    hasActivatedExtensions: false,
  })
})

test('activateByEvent skips extensions that are incompatible with web', async () => {
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (): Promise<Response> => {
      return {
        json: async () => [
          {
            activation: ['onCommand:test'],
            compatibility: {
              web: false,
            },
            id: 'sample.incompatible-extension',
            isolated: true,
          },
        ],
        ok: true,
      } as Response
    },
  })

  await expect(activateByEvent('onCommand:test', '/assets', PlatformType.Web)).resolves.toEqual({
    error: undefined,
    hasActivatedExtensions: false,
  })
})

test('activateByEvent returns error when getAllExtensions fails', async () => {
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      throw new Error('Failed to get extensions')
    },
  })

  const result = await activateByEvent('onCommand:test', '/assets', 2)

  expect(result.hasActivatedExtensions).toBe(false)
  expect(result.error).toBeInstanceOf(Error)
  expect(result.error!.message).toBe('Failed to get extensions')
})

test('activateByEvent converts non-error failures to errors', async () => {
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      throw 'Failed with string'
    },
  })

  await expect(activateByEvent('onCommand:test', '/assets', PlatformType.Electron)).resolves.toEqual({
    error: new Error('Failed with string'),
    hasActivatedExtensions: false,
  })
})

test('activateByEvent returns hasActivatedExtensions false when event is none and no extensions are activating', async () => {
  const result = await activateByEvent('none', '', 1)

  expect(result).toEqual({
    error: undefined,
    hasActivatedExtensions: false,
  })
})

test('activateByEvent catches error from activateExtension3 and returns it in result', async () => {
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [
        {
          activation: ['onCommand:test'],
          id: 'sample.extension-one',
          isolated: true,
        },
      ]
    },
  })

  const result = await activateByEvent('onCommand:test', '/assets', 2)

  expect(result.hasActivatedExtensions).toBe(false)
  expect(result.error).toBeInstanceOf(Error)
})

test('activateByEvent resolves empty static context before reading extensions', async () => {
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: {
      origin: 'https://example.test',
      protocol: 'https:',
    },
  })
  state.rendererWorker = RendererWorker.registerMockRpc({
    'Layout.getAssetDir'() {
      return '/static'
    },
  })
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (url: string): Promise<Response> => {
      expect(url).toBe('/static/config/extensions.json')
      return {
        json: async () => [],
        ok: true,
      } as Response
    },
  })

  await expect(activateByEvent('onCommand:test', '', PlatformType.Remote)).resolves.toEqual({
    error: undefined,
    hasActivatedExtensions: false,
  })
})
