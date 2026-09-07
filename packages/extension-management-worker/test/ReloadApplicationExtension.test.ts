import type { Rpc } from '@lvce-editor/rpc'
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as Rpcs from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'
import { reloadApplicationExtension } from '../src/parts/ReloadApplicationExtension/ReloadApplicationExtension.ts'

const extension = { browser: 'blob:old', id: 'sample', isolated: true }
const replacement = { ...extension, browser: 'blob:new' }

beforeEach(() => {
  ExtensionsState.createApplication('source', 1, [extension])
  ExtensionsState.createApplication('preview', 1, [extension, { ...extension, id: 'other' }])
})

afterEach(() => {
  for (const id of ['source', 'preview']) {
    ExtensionsState.removeApplication(id)
    Rpcs.clear(id)
  }
})

test('replaces only the selected application extension and keeps its application generation', async () => {
  using renderer = RendererWorker.registerMockRpc({ 'LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker': () => {} })
  const dispose = jest.fn(async () => {})
  const sibling = { dispose: jest.fn() } as unknown as Rpc
  Rpcs.set('sample', { dispose } as unknown as Rpc, 'preview')
  Rpcs.set('sample', sibling, 'source')
  Rpcs.set('other', sibling, 'preview')
  ExtensionsState.updateRuntimeStatus('sample', { activationEvent: 'onFileSystem:test' }, 'preview')
  const generation = ExtensionsState.get('preview').applicationGeneration

  await reloadApplicationExtension('preview', 'sample', replacement)

  expect(dispose).toHaveBeenCalledTimes(1)
  expect(sibling.dispose).not.toHaveBeenCalled()
  expect(Rpcs.get('sample', 'source')).toBe(sibling)
  expect(Rpcs.get('other', 'preview')).toBe(sibling)
  expect(Rpcs.get('sample', 'preview')).toBeUndefined()
  expect(ExtensionsState.get('source').webExtensions).toEqual([extension])
  expect(ExtensionsState.get('preview').webExtensions).toEqual([replacement, { ...extension, id: 'other' }])
  expect(ExtensionsState.get('preview').applicationGeneration).toBe(generation)
  expect(ExtensionsState.getRuntimeStatus('sample', 'preview')).toBeUndefined()
  expect(renderer.invocations).toEqual([
    ['LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker', JSON.stringify(['preview', generation, 'sample'])],
  ])
})

test('serializes repeated replacements and recovers after a failed disposal', async () => {
  const gate = Promise.withResolvers<void>()
  using renderer = RendererWorker.registerMockRpc({
    'LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker': jest
      .fn<() => Promise<void>>()
      .mockImplementationOnce(() => gate.promise)
      .mockResolvedValue(undefined),
  })
  const first = reloadApplicationExtension('preview', 'sample', replacement)
  const second = reloadApplicationExtension('preview', 'sample', { ...replacement, browser: 'blob:latest' })
  const results = Promise.allSettled([first, second])
  gate.reject(new Error('teardown failed'))
  const settled = await results
  expect(settled[0].status).toBe('rejected')
  expect(settled[1].status).toBe('fulfilled')
  expect(renderer.invocations).toHaveLength(2)
  expect(ExtensionsState.get('preview').webExtensions[0].browser).toBe('blob:latest')
})

test('rejects invalid replacements before touching workers', async () => {
  using renderer = RendererWorker.registerMockRpc({})
  await expect(reloadApplicationExtension('preview', 'sample', {})).rejects.toThrow('isolated web extension')
  await expect(reloadApplicationExtension('preview', 'missing', replacement)).rejects.toThrow('not found')
  await expect(reloadApplicationExtension('preview', 'sample', { ...replacement, id: 'other' })).rejects.toThrow('Duplicate')
  expect(renderer.invocations).toEqual([])
  expect(ExtensionsState.get('preview').webExtensions[0]).toEqual(extension)
})

test('queued replacements cannot mutate a recreated application', async () => {
  using renderer = RendererWorker.registerMockRpc({})
  const reload = reloadApplicationExtension('preview', 'sample', replacement)
  ExtensionsState.removeApplication('preview')
  ExtensionsState.createApplication('preview', 1, [extension])
  await expect(reload).rejects.toThrow('Stale extension application')
  expect(renderer.invocations).toEqual([])
  expect(ExtensionsState.get('preview').webExtensions).toEqual([extension])
})
