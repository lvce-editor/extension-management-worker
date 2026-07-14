import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as ExecuteSourceControlProvider from '../src/parts/ExecuteSourceControlProvider/ExecuteSourceControlProvider.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const state: { rendererWorker: DisposableMockRpc | undefined } = {
  rendererWorker: undefined,
}

const createExtensionsState = (webExtensions: readonly any[]): ExtensionsState => ({
  activatedExtensions: Object.create(null),
  cachedActivationEvents: Object.create(null),
  cachedExtensions: undefined,
  disabledIds: [],
  platform: 1,
  runtimeStatuses: Object.create(null),
  webExtensions,
})

beforeEach(() => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'Layout.getAssetDir'() {
      return '/assets'
    },
  })
})

afterEach(() => {
  IsolatedExtensionHostWorkerState.clear()
  state.rendererWorker?.[Symbol.dispose]()
  state.rendererWorker = undefined
})

test('gets enabled isolated source control provider ids', async () => {
  const invocations: unknown[] = []
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...params: readonly unknown[]) => {
      invocations.push([method, ...params])
      return params[0] === 'git'
    },
    invokeAndTransfer: async () => {},
    send() {},
  }
  IsolatedExtensionHostWorkerState.set('git-extension', rpc)
  const extensionsState = createExtensionsState([
    {
      id: 'git-extension',
      isolated: true,
      sourceControlProviders: [{ id: 'git' }, { id: 'disabled' }],
    },
  ])

  await expect(ExecuteSourceControlProvider.getEnabledSourceControlProviderIds(extensionsState, 'file', '/workspace')).resolves.toEqual(['git'])
  expect(invocations).toEqual([
    ['ExtensionApi.executeSourceControlIsActive', 'git', 'file', '/workspace'],
    ['ExtensionApi.executeSourceControlIsActive', 'disabled', 'file', '/workspace'],
  ])
})

test('executes matching isolated source control provider', async () => {
  const invocations: unknown[] = []
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...params: readonly unknown[]) => {
      invocations.push([method, ...params])
      return [{ id: 'changes' }]
    },
    invokeAndTransfer: async () => {},
    send() {},
  }
  IsolatedExtensionHostWorkerState.set('git-extension', rpc)
  const extensionsState = createExtensionsState([
    {
      id: 'git-extension',
      isolated: true,
      sourceControlProviders: [{ id: 'git' }],
    },
  ])

  await expect(
    ExecuteSourceControlProvider.executeSourceControlProvider(extensionsState, 'git', 'executeSourceControlGetGroups', '/workspace'),
  ).resolves.toEqual({ found: true, result: [{ id: 'changes' }] })
  expect(invocations).toEqual([['ExtensionApi.executeSourceControlGetGroups', 'git', '/workspace']])
})

test('reports no provider when no isolated contribution matches', async () => {
  await expect(
    ExecuteSourceControlProvider.executeSourceControlProvider(createExtensionsState([]), 'git', 'executeSourceControlGetChangedFiles'),
  ).resolves.toEqual({ found: false })
})

test('ignores disabled isolated source control providers', async () => {
  const extensionsState = createExtensionsState([
    {
      disabled: true,
      id: 'git-extension',
      isolated: true,
      sourceControlProviders: [{ id: 'git' }],
    },
  ])

  await expect(ExecuteSourceControlProvider.getEnabledSourceControlProviderIds(extensionsState, 'file', '/workspace')).resolves.toEqual([])
})
