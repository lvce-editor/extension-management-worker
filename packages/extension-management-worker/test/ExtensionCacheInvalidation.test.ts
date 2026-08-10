import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import { disableExtension2 } from '../src/parts/DisableExtension2/DisableExtension2.ts'
import { enableExtension2 } from '../src/parts/EnableExtension2/EnableExtension2.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
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

test('disableExtension2 remains compatible with shared processes without language server disposal', async () => {
  state.sharedProcess?.[Symbol.dispose]()
  state.sharedProcess = SharedProcess.registerMockRpc({
    'LanguageServer.dispose'() {
      throw new Error('Command not found')
    },
  })

  await expect(disableExtension2('sample.extension', PlatformType.Test)).resolves.toBeUndefined()
})
