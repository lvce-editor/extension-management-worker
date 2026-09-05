import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { commandMap } from '../src/parts/CommandMap/CommandMap.ts'
import { disposeExtensionApplication } from '../src/parts/DisposeExtensionApplication/DisposeExtensionApplication.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as FileChangeHandlerRegistry from '../src/parts/FileChangeHandlerRegistry/FileChangeHandlerRegistry.ts'
import * as Rpcs from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const state: { renderer: DisposableMockRpc | undefined } = { renderer: undefined }
const disposeWorker = jest.fn(async (_id: string) => {})
const execute = jest.fn(async (...args: readonly unknown[]) => args)
const manifest = { fileSystemProviders: [{ id: 'memfs' }], id: 'sample', isolated: true }

beforeEach(() => {
  disposeWorker.mockClear()
  execute.mockClear()
  ExtensionsState.createApplication('source', 1, [manifest])
  ExtensionsState.createApplication('preview', 1, [manifest])
  state.renderer = RendererWorker.registerMockRpc({
    'Application.execute': execute,
    'LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker': disposeWorker,
    'Layout.getAssetDir': () => '/assets',
  })
})

afterEach(() => {
  for (const id of ['source', 'preview']) {
    ExtensionsState.removeApplication(id)
    Rpcs.clear(id)
    FileChangeHandlerRegistry.reset(id)
  }
  state.renderer?.[Symbol.dispose]()
})

const rpc = (value: string): Rpc => ({
  dispose: async () => {},
  invoke: async () => value,
  invokeAndTransfer: async () => {},
  send: () => {},
})

test('the same provider and URI route to distinct application workers', async () => {
  Rpcs.set('sample', rpc('source content'), 'source')
  Rpcs.set('sample', rpc('preview content'), 'preview')
  const invoke = commandMap['Extensions.invokeForApplication']
  expect(await invoke('source', 'Extensions.executeFileSystemProviderReadFile', 'memfs', 'memfs:///README.md')).toEqual({
    found: true,
    result: 'source content',
  })
  expect(await invoke('preview', 'Extensions.executeFileSystemProviderReadFile', 'memfs', 'memfs:///README.md')).toEqual({
    found: true,
    result: 'preview content',
  })
  expect(Rpcs.get('sample')).toBeUndefined()
})

test('unsupported application commands fail closed and filesystem callbacks carry their owner', async () => {
  const invoke = commandMap['Extensions.invokeForApplication']
  await expect(invoke('preview', 'Extensions.disposeAllRuntimes')).rejects.toThrow('does not support application context')
  await invoke('source', 'ExtensionApi.readFile', 'memfs:///main.ts')
  expect(execute).toHaveBeenCalledWith('source', 'FileSystem.readFile', 'memfs:///main.ts')
  expect(await invoke('source', 'Extensions.getDynamicWebExtensions')).toEqual([manifest])
})

test('disposal invalidates the application before awaiting teardown and leaves its sibling running', async () => {
  const gate = Promise.withResolvers<void>()
  const preview = { ...rpc('preview'), dispose: () => gate.promise }
  const source = rpc('source')
  Rpcs.set('sample', preview, 'preview')
  Rpcs.set('sample', source, 'source')
  FileChangeHandlerRegistry.register('sample', 'preview')
  const application = ExtensionsState.get('preview')
  const disposing = disposeExtensionApplication('preview')
  expect(ExtensionsState.isCurrentApplication(application)).toBe(false)
  expect(Rpcs.get('sample', 'preview')).toBeUndefined()
  expect(Rpcs.get('sample', 'source')).toBe(source)
  expect(FileChangeHandlerRegistry.getRegisteredExtensionIds('preview')).toEqual([])
  expect(disposeWorker).toHaveBeenCalledWith(JSON.stringify(['preview', application.applicationGeneration, 'sample']))
  gate.resolve()
  await disposing
})

test('disposal still terminates the physical worker if RPC disposal throws synchronously', async () => {
  Rpcs.set(
    'sample',
    {
      ...rpc('preview'),
      dispose: () => {
        throw new Error('broken transport')
      },
    },
    'preview',
  )
  await expect(disposeExtensionApplication('preview')).rejects.toThrow('Failed to dispose extension application')
  expect(disposeWorker).toHaveBeenCalledTimes(1)
  expect(ExtensionsState.get('source').webExtensions).toEqual([manifest])
})
