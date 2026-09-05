import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import * as ActivateByEvent from '../src/parts/ActivateByEvent/ActivateByEvent.ts'
import { commandMap } from '../src/parts/CommandMap/CommandMap.ts'
import { disposeExtensionApplication } from '../src/parts/DisposeExtensionApplication/DisposeExtensionApplication.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as FileChangeHandlerRegistry from '../src/parts/FileChangeHandlerRegistry/FileChangeHandlerRegistry.ts'
import { handleRpcInfos } from '../src/parts/HandleRpcInfos/HandleRpcInfos.ts'
import * as Rpcs from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const state: { renderer: DisposableMockRpc | undefined } = { renderer: undefined }
const disposeWorker = jest.fn(async (_id: string) => {})
const execute = jest.fn(async (...args: readonly unknown[]) => args)
const manifest = { fileSystemProviders: [{ id: 'memfs' }], id: 'sample', isolated: true }

beforeEach(() => {
  jest.useFakeTimers()
  disposeWorker.mockClear()
  execute.mockClear()
  ExtensionsState.createApplication('source', 1, [manifest])
  ExtensionsState.createApplication('preview', 1, [manifest])
  state.renderer = RendererWorker.registerMockRpc({
    'Application.execute': execute,
    'Extensions.getPreference': () => 4,
    'LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker': disposeWorker,
    'Layout.getAssetDir': () => '/assets',
  })
})

afterEach(() => {
  jest.clearAllTimers()
  jest.useRealTimers()
  for (const id of ['source', 'preview']) {
    try {
      ActivateByEvent.resetAllExtensionActivations(ExtensionsState.get(id))
    } catch {
      // Disposal tests already removed the application.
    }
    ExtensionsState.removeApplication(id)
    Rpcs.clear(id)
    FileChangeHandlerRegistry.reset(id)
  }
  state.renderer?.[Symbol.dispose]()
})

test('application metadata and status calls stay within the requested session', async () => {
  const invoke = commandMap['Extensions.invokeForApplication']
  const catalog = await invoke('source', 'Extensions.getAllExtensions', '/assets', 1)
  expect(catalog).toEqual([expect.objectContaining({ ...manifest, applicationId: 'source' })])
  expect(await invoke('preview', 'Extensions.getAllExtensions')).toEqual([expect.objectContaining({ applicationId: 'preview' })])
  expect(await invoke('source', 'Extensions.getViews', '/assets', 1)).toEqual([])
  expect(await invoke('preview', 'Extensions.getViews')).toEqual([])
  expect(await invoke('source', 'Extensions.getRuntimeStatus', 'sample')).toBeUndefined()
  expect(await invoke('source', 'Extensions.getStatusBarItems')).toEqual([])
  expect(await invoke('source', 'Extensions.activateByEvent', 'onNothing', '/assets', 1)).toEqual({ error: undefined, hasActivatedExtensions: false })
  expect(await invoke('preview', 'Extensions.activateByEvent', 'none', '/assets')).toEqual({ error: undefined, hasActivatedExtensions: false })
  await invoke('source', 'Extensions.handleFileChanges', { changed: ['memfs:///main.ts'] })
  await expect(invoke('source', 'Unknown.command')).rejects.toThrow('does not support application context')
  await invoke('source', 'Extensions.executeCommand', 'Main.openInput', 'memfs:///main.ts')
  expect(execute).toHaveBeenCalledWith('source', 'Main.openInput', 'memfs:///main.ts')
})

test('application manifests cannot mutate global declared RPC registries', () => {
  expect(() => handleRpcInfos({ applicationId: 'preview', rpc: [{ id: 'shared', type: 'node' }] }, 1)).toThrow('do not support application context')
  expect(() => handleRpcInfos({ applicationId: 'preview' }, 1)).not.toThrow()
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
