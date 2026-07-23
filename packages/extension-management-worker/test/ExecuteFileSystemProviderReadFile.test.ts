import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { executeFileSystemProviderReadFile } from '../src/parts/ExecuteFileSystemProviderReadFile/ExecuteFileSystemProviderReadFile.ts'
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

test('reads from a matching isolated file system provider', async () => {
  const invocations: unknown[] = []
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...params: readonly unknown[]) => {
      invocations.push([method, ...params])
      return 'before content'
    },
    invokeAndTransfer: async () => {},
    send() {},
  }
  IsolatedExtensionHostWorkerState.set('git-extension', rpc)
  const extensionsState = createExtensionsState([
    {
      fileSystemProviders: [{ id: 'git-file-before' }],
      id: 'git-extension',
      isolated: true,
    },
  ])

  await expect(executeFileSystemProviderReadFile(extensionsState, 'git-file-before', 'file:///workspace/file.txt')).resolves.toEqual({
    found: true,
    result: 'before content',
  })
  expect(invocations).toEqual([['ExtensionApi.executeFileSystemProviderReadFile', 'git-file-before', 'file:///workspace/file.txt']])
})

test('reports no provider when no isolated contribution matches', async () => {
  await expect(executeFileSystemProviderReadFile(createExtensionsState([]), 'git-file-before', 'file:///workspace/file.txt')).resolves.toEqual({
    found: false,
  })
})

test('ignores disabled isolated file system providers', async () => {
  const extensionsState = createExtensionsState([
    {
      disabled: true,
      fileSystemProviders: [{ id: 'git-file-before' }],
      id: 'git-extension',
      isolated: true,
    },
  ])

  await expect(executeFileSystemProviderReadFile(extensionsState, 'git-file-before', 'file:///workspace/file.txt')).resolves.toEqual({
    found: false,
  })
})
