import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import { commandMap } from '../src/parts/CommandMap/CommandMap.ts'
import { disposeAllExtensionRuntimes } from '../src/parts/DisposeAllExtensionRuntimes/DisposeAllExtensionRuntimes.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const disposeFirst = jest.fn(async () => {})
const disposeSecond = jest.fn(async () => {})

const state: { rendererWorker?: DisposableMockRpc; sharedProcess?: DisposableMockRpc } = {}

beforeEach(() => {
  disposeFirst.mockClear()
  disposeSecond.mockClear()
  ExtensionsState.reset()
  IsolatedExtensionHostWorkerState.clear()
  IsolatedExtensionHostWorkerState.set('sample.first', { dispose: disposeFirst } as any)
  IsolatedExtensionHostWorkerState.set('sample.second', { dispose: disposeSecond } as any)
  ExtensionsState.updateRuntimeStatus('sample.failed', { status: 3 })
  state.rendererWorker = RendererWorker.registerMockRpc({
    'LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker'() {},
  })
  state.sharedProcess = SharedProcess.registerMockRpc({
    'LanguageServer.dispose'() {},
    'LanguageServer.disposeAll'() {},
  })
})

afterEach(() => {
  state.rendererWorker?.[Symbol.dispose]()
  state.rendererWorker = undefined
  state.sharedProcess?.[Symbol.dispose]()
  state.sharedProcess = undefined
})

test('disposes all language servers and isolated extension hosts', async () => {
  await disposeAllExtensionRuntimes()

  expect(state.sharedProcess?.invocations).toEqual([['LanguageServer.disposeAll']])
  expect(state.rendererWorker?.invocations).toEqual([
    ['LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker', 'sample.first'],
    ['LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker', 'sample.second'],
  ])
  expect(disposeFirst).toHaveBeenCalledTimes(1)
  expect(disposeSecond).toHaveBeenCalledTimes(1)
  expect(IsolatedExtensionHostWorkerState.get('sample.first')).toBeUndefined()
  expect(IsolatedExtensionHostWorkerState.get('sample.second')).toBeUndefined()
  expect(ExtensionsState.get().runtimeStatuses).toEqual({})
})

test('falls back to per-extension language server disposal with older shared processes', async () => {
  state.sharedProcess?.[Symbol.dispose]()
  state.sharedProcess = SharedProcess.registerMockRpc({
    'LanguageServer.dispose'() {},
  })

  await disposeAllExtensionRuntimes()

  expect(state.sharedProcess.invocations).toEqual([
    ['LanguageServer.disposeAll'],
    ['LanguageServer.dispose', 'sample.first'],
    ['LanguageServer.dispose', 'sample.second'],
  ])
})

test('exposes the bulk disposal command', () => {
  expect(commandMap['Extensions.disposeAllRuntimes']).toBe(disposeAllExtensionRuntimes)
})
