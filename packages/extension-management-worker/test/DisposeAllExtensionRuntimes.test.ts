import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import { commandMap } from '../src/parts/CommandMap/CommandMap.ts'
import { disposeAllExtensionRuntimes } from '../src/parts/DisposeAllExtensionRuntimes/DisposeAllExtensionRuntimes.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const disposeFirst = jest.fn(async () => {})
const disposeSecond = jest.fn(async () => {})
const getNoExtensions = async () => []

const state: { rendererWorker: DisposableMockRpc | undefined; sharedProcess: DisposableMockRpc | undefined } = {
  rendererWorker: undefined,
  sharedProcess: undefined,
}

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
  await disposeAllExtensionRuntimes(getNoExtensions as any)

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

  await disposeAllExtensionRuntimes(getNoExtensions as any)

  expect(state.sharedProcess.invocations).toEqual([
    ['LanguageServer.disposeAll'],
    ['LanguageServer.dispose', 'sample.first'],
    ['LanguageServer.dispose', 'sample.second'],
  ])
})

test('preserves workspace-independent extension runtimes', async () => {
  const getExtensions = jest.fn(async () => [{ id: 'sample.first', preserveRuntimeOnWorkspaceChange: true }, { id: 'sample.second' }])

  await disposeAllExtensionRuntimes(getExtensions as any)

  expect(state.sharedProcess?.invocations).toEqual([['LanguageServer.dispose', 'sample.second']])
  expect(state.rendererWorker?.invocations).toEqual([['LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker', 'sample.second']])
  expect(disposeFirst).not.toHaveBeenCalled()
  expect(disposeSecond).toHaveBeenCalledTimes(1)
  expect(IsolatedExtensionHostWorkerState.get('sample.first')).toBeDefined()
  expect(IsolatedExtensionHostWorkerState.get('sample.second')).toBeUndefined()
})

test('preserves runtimes when an older shared process cannot dispose one language server', async () => {
  state.sharedProcess?.[Symbol.dispose]()
  state.sharedProcess = SharedProcess.registerMockRpc({})
  const getExtensions = jest.fn(async () => [{ id: 'sample.first', preserveRuntimeOnWorkspaceChange: true }])

  await expect(disposeAllExtensionRuntimes(getExtensions as any)).resolves.toBeUndefined()

  expect(state.sharedProcess.invocations).toEqual([['LanguageServer.dispose', 'sample.second']])
  expect(IsolatedExtensionHostWorkerState.get('sample.first')).toBeDefined()
})

test('exposes the bulk disposal command', () => {
  expect(commandMap['Extensions.disposeAllRuntimes']).toBe(disposeAllExtensionRuntimes)
})
