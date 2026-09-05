import type { Rpc } from '@lvce-editor/rpc'
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals'
import { RendererWorker, type DisposableMockRpc } from '@lvce-editor/rpc-registry'
import type { ExtensionCommandMap } from '../src/parts/CreateExtensionCommandMap/CreateExtensionCommandMap.ts'
import * as CommandMapRef from '../src/parts/CommandMapRef/CommandMapRef.ts'
import { disposeExtensionApplication } from '../src/parts/DisposeExtensionApplication/DisposeExtensionApplication.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as FileChangeHandlerRegistry from '../src/parts/FileChangeHandlerRegistry/FileChangeHandlerRegistry.ts'
import * as Rpcs from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const {
  createIsolatedExtensionHostWorker,
  getOrCreateIsolatedExtensionHostWorker: getWorker,
  getPendingExtensionIds,
} = await import('../src/parts/GetOrCreateIsolatedExtensionHostWorker/GetOrCreateIsolatedExtensionHostWorker.ts')
const disposeWorker = jest.fn(async (_runtimeId: string) => {})
const state: { renderer: DisposableMockRpc | undefined } = { renderer: undefined }

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
  ExtensionsState.createApplication('source', 1, [])
  ExtensionsState.createApplication('preview', 1, [])
  disposeWorker.mockClear()
  state.renderer = RendererWorker.registerMockRpc({
    'LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker': disposeWorker,
  })
})

afterEach(() => {
  for (const key of Object.keys(CommandMapRef.commandMapRef)) {
    delete (CommandMapRef.commandMapRef as Record<string, unknown>)[key]
  }
  FileChangeHandlerRegistry.reset('preview')
  ExtensionsState.removeApplication('source')
  ExtensionsState.removeApplication('preview')
  Rpcs.clear('source')
  Rpcs.clear('preview')
  jest.restoreAllMocks()
  state.renderer?.[Symbol.dispose]()
})

test('worker callbacks retain the application generation and file-watcher ownership', async () => {
  const invokeApplication = jest.fn((...args: readonly unknown[]) => args)
  Object.assign(CommandMapRef.commandMapRef, { 'Extensions.getPreference': () => 'legacy', 'Extensions.invokeForApplication': invokeApplication })
  const captured: { commands: ExtensionCommandMap } = { commands: {} }
  const send = jest.fn(async (..._args: readonly any[]) => {})
  const rpc = { dispose: async () => {}, ipc: {} } as unknown as Rpc
  const application = ExtensionsState.get('preview')
  await createIsolatedExtensionHostWorker(
    'sample',
    '/preview.js',
    '',
    '',
    async (options) => {
      captured.commands = options.commandMap
      await options.send({} as MessagePort)
      return rpc
    },
    send,
    application,
  )
  expect(send).toHaveBeenCalledWith(
    'LaunchIsolatedExtensionHostWorker.launchIsolatedExtensionHostWorker',
    {},
    JSON.stringify(['preview', application.applicationGeneration, 'sample']),
    '/preview.js',
    '',
    '',
  )
  expect(captured.commands['Extensions.getPreference']('editor.tabSize')).toEqual(['preview', 'Extensions.getPreference', 'editor.tabSize'])
  captured.commands['Extensions.registerFileChangeHandler']()
  expect(FileChangeHandlerRegistry.getRegisteredExtensionIds('preview')).toEqual(['sample'])
  expect(FileChangeHandlerRegistry.getRegisteredExtensionIds()).toEqual([])
  captured.commands['Extensions.unregisterFileChangeHandler']()
  expect(FileChangeHandlerRegistry.getRegisteredExtensionIds('preview')).toEqual([])
  delete (CommandMapRef.commandMapRef as Record<string, unknown>)['Extensions.invokeForApplication']
  expect(() => captured.commands['Extensions.getPreference']('test')).toThrow('routing is not initialized')
  ExtensionsState.removeApplication('preview')
  ExtensionsState.createApplication('preview', 1, [])
  expect(() => captured.commands['Extensions.getPreference']('test')).toThrow('Stale extension application')
  expect(() => captured.commands['Extensions.registerFileChangeHandler']()).toThrow('Stale extension application')
})

test('application disposal terminates pending launches without waiting for worker activation', async () => {
  const application = ExtensionsState.get('preview')
  const gate = Promise.withResolvers<Rpc>()
  const pending = getWorker('sample', '/preview.js', '', '', async () => gate.promise, 'preview')
  const result = Promise.allSettled([pending])
  expect(getPendingExtensionIds(application)).toEqual(['sample'])
  expect(getPendingExtensionIds(ExtensionsState.get('source'))).toEqual([])
  await disposeExtensionApplication('preview')
  expect(disposeWorker).toHaveBeenCalledWith(JSON.stringify(['preview', application.applicationGeneration, 'sample']))
  gate.resolve({ dispose: async () => {} } as Rpc)
  expect(await result).toEqual([{ reason: expect.objectContaining({ message: 'Stale extension application: preview' }), status: 'rejected' }])
  expect(getPendingExtensionIds(application)).toEqual([])
})

test('deduplicates concurrent activation within an application while keeping identical extension ids independent', async () => {
  const gate = Promise.withResolvers<void>()
  const sourceRpc = { dispose: jest.fn() } as unknown as Rpc
  const previewRpc = { dispose: jest.fn() } as unknown as Rpc
  const create = jest.fn(async (_id, _path, _name, _policy, application?: { readonly applicationId?: string | undefined }) => {
    await gate.promise
    return application?.applicationId === 'source' ? sourceRpc : previewRpc
  })
  const source = getWorker('sample', 'source.js', '', '', create, 'source')
  const duplicateSource = getWorker('sample', 'source.js', '', '', create, 'source')
  const preview = getWorker('sample', 'preview.js', '', '', create, 'preview')
  gate.resolve()

  expect(await source).toBe(sourceRpc)
  expect(await duplicateSource).toBe(sourceRpc)
  expect(await preview).toBe(previewRpc)
  expect(create).toHaveBeenCalledTimes(2)
  expect(Rpcs.get('sample', 'source')).toBe(sourceRpc)
  expect(Rpcs.get('sample', 'preview')).toBe(previewRpc)
  expect(Rpcs.get('sample')).toBeUndefined()
})

test('late activation is disposed and cannot replace a new generation of the same application', async () => {
  const oldApplication = ExtensionsState.get('preview')
  const gate = Promise.withResolvers<Rpc>()
  const oldDispose = jest.fn(async () => {})
  const oldWorker = getWorker('sample', 'old.js', '', '', async () => gate.promise, 'preview')
  const rejected = Promise.allSettled([oldWorker])

  ExtensionsState.removeApplication('preview')
  ExtensionsState.createApplication('preview', 1, [])
  const newRpc = { dispose: jest.fn() } as unknown as Rpc
  await getWorker('sample', 'new.js', '', '', async () => newRpc, 'preview')
  gate.resolve({ dispose: oldDispose } as unknown as Rpc)
  expect(await rejected).toEqual([{ reason: expect.objectContaining({ message: 'Stale extension application: preview' }), status: 'rejected' }])

  expect(oldDispose).toHaveBeenCalledTimes(1)
  expect(Rpcs.get('sample', 'preview')).toBe(newRpc)
  expect(disposeWorker).toHaveBeenCalledWith(JSON.stringify(['preview', oldApplication.applicationGeneration, 'sample']))
})
