import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { MainProcess } from '@lvce-editor/rpc-registry'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as SecretStorage from '../src/parts/SecretStorage/SecretStorage.ts'

const originalCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches')
const state: { mainProcess: DisposableMockRpc | undefined } = {
  mainProcess: undefined,
}

beforeEach(() => {
  ExtensionsState.reset()
})

afterEach(() => {
  state.mainProcess?.[Symbol.dispose]()
  state.mainProcess = undefined
  if (originalCaches) {
    Object.defineProperty(globalThis, 'caches', originalCaches)
  } else {
    delete (globalThis as any).caches
  }
})

test('electron secret storage delegates directly to the main process', async () => {
  ExtensionsState.setPlatform(PlatformType.Electron)
  state.mainProcess = MainProcess.registerMockRpc({
    'SecretStorage.delete'() {},
    'SecretStorage.get'() {
      return 'stored-value'
    },
    'SecretStorage.store'() {},
  })

  await expect(SecretStorage.getSecret('sample.extension', 'token')).resolves.toBe('stored-value')
  await SecretStorage.storeSecret('sample.extension', 'token', 'new-value')
  await SecretStorage.deleteSecret('sample.extension', 'token')

  expect(state.mainProcess.invocations).toEqual([
    ['SecretStorage.get', 'sample.extension', 'token'],
    ['SecretStorage.store', 'sample.extension', 'token', 'new-value'],
    ['SecretStorage.delete', 'sample.extension', 'token'],
  ])
})

test('web and remote secret storage uses extension-scoped cache entries', async () => {
  const values = new Map<string, string>()
  const openedCacheNames: string[] = []
  Object.defineProperty(globalThis, 'caches', {
    configurable: true,
    value: {
      async open(name: string): Promise<Cache> {
        openedCacheNames.push(name)
        return {
          async delete(request: string): Promise<boolean> {
            return values.delete(request)
          },
          async match(request: string): Promise<Response | undefined> {
            const value = values.get(request)
            return value === undefined ? undefined : new Response(value)
          },
          async put(request: string, response: Response): Promise<void> {
            values.set(request, await response.text())
          },
        } as unknown as Cache
      },
    },
  })

  await SecretStorage.storeSecret('sample.extension', 'api/token', 'stored-value')
  await expect(SecretStorage.getSecret('sample.extension', 'api/token')).resolves.toBe('stored-value')
  await expect(SecretStorage.getSecret('other.extension', 'api/token')).resolves.toBeUndefined()
  await SecretStorage.deleteSecret('sample.extension', 'api/token')
  await expect(SecretStorage.getSecret('sample.extension', 'api/token')).resolves.toBeUndefined()

  expect(openedCacheNames).toEqual(Array(5).fill(SecretStorage.cacheName))
})
