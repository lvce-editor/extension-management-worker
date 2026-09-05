import type { Rpc } from '@lvce-editor/rpc'
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals'
import { RendererWorker, type DisposableMockRpc } from '@lvce-editor/rpc-registry'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as Rpcs from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const { getOrCreateIsolatedExtensionHostWorker: getWorker } =
  await import('../src/parts/GetOrCreateIsolatedExtensionHostWorker/GetOrCreateIsolatedExtensionHostWorker.ts')
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
  ExtensionsState.removeApplication('source')
  ExtensionsState.removeApplication('preview')
  Rpcs.clear('source')
  Rpcs.clear('preview')
  jest.restoreAllMocks()
  state.renderer?.[Symbol.dispose]()
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
  expect(await rejected).toEqual([{ status: 'rejected', reason: expect.objectContaining({ message: 'Stale extension application: preview' }) }])

  expect(oldDispose).toHaveBeenCalledTimes(1)
  expect(Rpcs.get('sample', 'preview')).toBe(newRpc)
  expect(disposeWorker).toHaveBeenCalledWith(JSON.stringify(['preview', oldApplication.applicationGeneration, 'sample']))
})
