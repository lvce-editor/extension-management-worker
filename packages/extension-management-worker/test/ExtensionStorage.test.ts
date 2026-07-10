import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as ExtensionStorage from '../src/parts/ExtensionStorage/ExtensionStorage.ts'

const originalCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches')
const state: { sharedProcess: DisposableMockRpc | undefined } = {
  sharedProcess: undefined,
}

beforeEach(() => {
  ExtensionsState.reset()
})

afterEach(() => {
  state.sharedProcess?.[Symbol.dispose]()
  state.sharedProcess = undefined
  if (originalCaches) {
    Object.defineProperty(globalThis, 'caches', originalCaches)
  } else {
    delete (globalThis as any).caches
  }
})

const mockCaches = (initialData?: unknown): { readonly getData: () => unknown } => {
  let data = initialData
  Object.defineProperty(globalThis, 'caches', {
    configurable: true,
    value: {
      async match(): Promise<Response | undefined> {
        if (data === undefined) {
          return undefined
        }
        return {
          json: async () => data,
        } as Response
      },
      async open(): Promise<unknown> {
        return {
          async put(_key: string, response: Response): Promise<void> {
            data = await response.json()
          },
        }
      },
    },
  })
  return {
    getData: () => data,
  }
}

test('updates disabled extension state for test platform', async () => {
  ExtensionsState.update({ disabledIds: ['existing.extension'] })

  await ExtensionStorage.disableExtension2('sample.extension', PlatformType.Test)
  expect(ExtensionsState.get().disabledIds).toEqual(['existing.extension', 'sample.extension'])

  await ExtensionStorage.enableExtension2('sample.extension', PlatformType.Test)
  expect(ExtensionsState.get().disabledIds).toEqual(['existing.extension'])
})

test('web platform creates and updates cached disabled extensions', async () => {
  const cache = mockCaches()

  await ExtensionStorage.disableExtension2('sample.extension', PlatformType.Web)
  expect(cache.getData()).toEqual({ disabledExtensions: ['sample.extension'] })

  await ExtensionStorage.disableExtension2('other.extension', PlatformType.Web)
  expect(cache.getData()).toEqual({ disabledExtensions: ['sample.extension', 'other.extension'] })

  await ExtensionStorage.enableExtension2('sample.extension', PlatformType.Web)
  expect(cache.getData()).toEqual({ disabledExtensions: ['other.extension'] })
})

test('web platform handles cached data without disabled extensions', async () => {
  const cache = mockCaches({})

  await ExtensionStorage.enableExtension2('sample.extension', PlatformType.Web)

  expect(cache.getData()).toEqual({ disabledExtensions: [] })
})

test('desktop platform delegates disabling to the shared process', async () => {
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.disable'() {},
  })

  await ExtensionStorage.disableExtension2('sample.extension', PlatformType.Electron)

  expect(state.sharedProcess.invocations).toEqual([['ExtensionManagement.disable', 'sample.extension']])
})

test('desktop platform enabling does not modify test state or cache', async () => {
  ExtensionsState.update({ disabledIds: ['sample.extension'] })

  await ExtensionStorage.enableExtension2('sample.extension', PlatformType.Electron)

  expect(ExtensionsState.get().disabledIds).toEqual(['sample.extension'])
})
