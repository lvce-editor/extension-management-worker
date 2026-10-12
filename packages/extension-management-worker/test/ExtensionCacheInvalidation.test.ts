import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import { disableExtension2 } from '../src/parts/DisableExtension2/DisableExtension2.ts'
import { enableExtension2 } from '../src/parts/EnableExtension2/EnableExtension2.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { getAllExtensionsWithState } from '../src/parts/GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import { installExtension } from '../src/parts/InstallExtension/InstallExtension.ts'
import { invalidateExtensionsCache } from '../src/parts/InvalidateExtensionsCache/InvalidateExtensionsCache.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'
import { uninstallExtension } from '../src/parts/UninstallExtension/UninstallExtension.ts'

const state: { rendererWorker: DisposableMockRpc | undefined; sharedProcess: DisposableMockRpc | undefined } = {
  rendererWorker: undefined,
  sharedProcess: undefined,
}

const getRendererWorker = (): DisposableMockRpc => {
  if (!state.rendererWorker) {
    throw new Error('Missing renderer worker')
  }
  return state.rendererWorker
}

beforeEach(() => {
  ExtensionsState.reset()
  IsolatedExtensionHostWorkerState.clear()
  state.rendererWorker = RendererWorker.registerMockRpc({
    'ExtensionManagement.handleExtensionsCacheInvalidated'() {},
  })
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.uninstall'() {},
    'LanguageServer.dispose'() {},
  })
})

afterEach(() => {
  jest.useRealTimers()
  state.rendererWorker?.[Symbol.dispose]()
  state.rendererWorker = undefined
  state.sharedProcess?.[Symbol.dispose]()
  state.sharedProcess = undefined
})

test('disableExtension2 disposes the worker before deferring the cache invalidation', async () => {
  jest.useFakeTimers()
  IsolatedExtensionHostWorkerState.set('sample.extension', { dispose: async () => {} } as any)

  await disableExtension2('sample.extension', PlatformType.Test)

  expect(state.sharedProcess?.invocations).toEqual([['LanguageServer.dispose', 'sample.extension']])
  expect(getRendererWorker().invocations).toEqual([['LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker', 'sample.extension']])

  await jest.runAllTimersAsync()

  expect(getRendererWorker().invocations).toEqual([
    ['LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker', 'sample.extension'],
    ['ExtensionManagement.handleExtensionsCacheInvalidated', 'sample.extension', true],
  ])
})

test('enableExtension2 invalidates extension cache', async () => {
  ExtensionsState.update({ disabledIds: ['sample.extension'] })

  await enableExtension2('sample.extension', PlatformType.Test)

  expect(getRendererWorker().invocations).toEqual([['ExtensionManagement.handleExtensionsCacheInvalidated', 'sample.extension', false]])
})

test('uninstallExtension invalidates extension cache', async () => {
  await uninstallExtension('sample.extension')

  expect(state.sharedProcess?.invocations).toEqual([
    ['ExtensionManagement.uninstall', 'sample.extension'],
    ['LanguageServer.dispose', 'sample.extension'],
  ])
  expect(getRendererWorker().invocations).toEqual([['ExtensionManagement.handleExtensionsCacheInvalidated']])
})

test('uninstallExtension removes a dynamic web extension without invoking the shared process', async () => {
  ExtensionsState.setWebExtensions([{ id: 'sample.extension', uri: 'file:///sample-extension' }])

  await uninstallExtension('sample.extension')

  expect(state.sharedProcess?.invocations).toEqual([['LanguageServer.dispose', 'sample.extension']])
  expect(ExtensionsState.get().webExtensions).toEqual([])
  expect(getRendererWorker().invocations).toEqual([['ExtensionManagement.handleExtensionsCacheInvalidated']])
})

test('installExtension invalidates extension cache', async () => {
  await installExtension()

  expect(getRendererWorker().invocations).toEqual([['ExtensionManagement.handleExtensionsCacheInvalidated']])
})

test('cache invalidation is compatible with older renderer workers', async () => {
  getRendererWorker()[Symbol.dispose]()
  state.rendererWorker = RendererWorker.registerMockRpc({
    'ExtensionManagement.handleExtensionsCacheInvalidated'() {
      throw new Error('Command not found')
    },
  })

  await expect(invalidateExtensionsCache()).resolves.toBeUndefined()
})

test('cache invalidation includes the changed extension state', async () => {
  await invalidateExtensionsCache('sample.extension', true)

  expect(getRendererWorker().invocations).toEqual([['ExtensionManagement.handleExtensionsCacheInvalidated', 'sample.extension', true]])
})

test('getAllExtensionsWithState caches shared-process discovery', async () => {
  ExtensionsState.setPlatform(PlatformType.Test)
  state.sharedProcess?.[Symbol.dispose]()
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [{ id: 'sample.extension', isolated: true }]
    },
  })

  await getAllExtensionsWithState(ExtensionsState.get(), '/assets', PlatformType.Test)
  await getAllExtensionsWithState(ExtensionsState.get(), '/assets', PlatformType.Test)

  expect(state.sharedProcess.invocations).toEqual([['ExtensionManagement.getAllExtensions']])
})

test('concurrent extension discovery requests share the in-flight shared-process request', async () => {
  ExtensionsState.setPlatform(PlatformType.Test)
  const { promise, resolve: resolveExtensions } = Promise.withResolvers<readonly any[]>()
  state.sharedProcess?.[Symbol.dispose]()
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return promise
    },
  })

  const first = getAllExtensionsWithState(ExtensionsState.get(), '/assets', PlatformType.Test)
  const second = getAllExtensionsWithState(ExtensionsState.get(), '/assets', PlatformType.Test)
  await new Promise<void>((resolve) => setImmediate(resolve))
  expect(state.sharedProcess.invocations).toEqual([['ExtensionManagement.getAllExtensions']])
  resolveExtensions([{ id: 'sample.extension', isolated: true }])
  await Promise.all([first, second])
})

test('failed extension discovery can be retried', async () => {
  ExtensionsState.setPlatform(PlatformType.Test)
  state.sharedProcess?.[Symbol.dispose]()
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      if (state.sharedProcess?.invocations.length === 1) {
        throw new Error('temporary failure')
      }
      return [{ id: 'sample.extension', isolated: true }]
    },
  })

  await expect(getAllExtensionsWithState(ExtensionsState.get(), '/assets', PlatformType.Test)).rejects.toThrow('temporary failure')
  await expect(getAllExtensionsWithState(ExtensionsState.get(), '/assets', PlatformType.Test)).resolves.toEqual([
    { id: 'sample.extension', isolated: true },
  ])
  expect(state.sharedProcess.invocations).toHaveLength(2)
})

test('extension cache invalidation refreshes shared-process discovery', async () => {
  ExtensionsState.setPlatform(PlatformType.Test)
  let discovery = 0
  state.sharedProcess?.[Symbol.dispose]()
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      discovery++
      return [{ id: `sample.extension.${discovery}`, isolated: true }]
    },
  })

  await getAllExtensionsWithState(ExtensionsState.get(), '/assets', PlatformType.Test)
  await invalidateExtensionsCache()
  await getAllExtensionsWithState(ExtensionsState.get(), '/assets', PlatformType.Test)

  expect(state.sharedProcess.invocations).toEqual([['ExtensionManagement.getAllExtensions'], ['ExtensionManagement.getAllExtensions']])
})

test('extension cache invalidation clears application discovery caches', async () => {
  ExtensionsState.createApplication('cache-invalidation-test', PlatformType.Test, [])
  let discovery = 0
  state.sharedProcess?.[Symbol.dispose]()
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      discovery++
      return [{ id: `sample.extension.${discovery}`, isolated: true }]
    },
  })

  try {
    await getAllExtensionsWithState(ExtensionsState.get('cache-invalidation-test'), '/assets', PlatformType.Test)
    await invalidateExtensionsCache()
    await getAllExtensionsWithState(ExtensionsState.get('cache-invalidation-test'), '/assets', PlatformType.Test)

    expect(state.sharedProcess.invocations).toHaveLength(2)
  } finally {
    ExtensionsState.removeApplication('cache-invalidation-test')
  }
})

test('disableExtension2 remains compatible with shared processes without language server disposal', async () => {
  state.sharedProcess?.[Symbol.dispose]()
  state.sharedProcess = SharedProcess.registerMockRpc({
    'LanguageServer.dispose'() {
      throw new Error('Command not found')
    },
  })

  await expect(disableExtension2('sample.extension', PlatformType.Test)).resolves.toBeUndefined()
})
