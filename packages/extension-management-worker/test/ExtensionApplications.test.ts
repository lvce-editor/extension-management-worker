import type { Rpc } from '@lvce-editor/rpc'
import { afterEach, expect, test } from '@jest/globals'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as Rpcs from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

afterEach(() => {
  ExtensionsState.reset()
  ExtensionsState.removeApplication('source')
  ExtensionsState.removeApplication('preview')
  Rpcs.clear()
  Rpcs.clear('source')
  Rpcs.clear('preview')
})

test('identical extension ids have independent state and activation status', () => {
  ExtensionsState.createApplication('source', 1, [{ browser: 'source.js', id: 'sample' }])
  ExtensionsState.createApplication('preview', 1, [{ browser: 'preview.js', id: 'sample' }])
  ExtensionsState.updateRuntimeStatus('sample', { activationEvent: 'onFileSystem:memfs' }, 'preview')

  expect(ExtensionsState.get('source').webExtensions).toEqual([{ browser: 'source.js', id: 'sample' }])
  expect(ExtensionsState.get('preview').webExtensions).toEqual([{ browser: 'preview.js', id: 'sample' }])
  expect(ExtensionsState.getRuntimeStatus('sample', 'source')).toBeUndefined()
  expect(ExtensionsState.getRuntimeStatus('sample')).toBeUndefined()
  expect(ExtensionsState.getRuntimeStatus('sample', 'preview')?.activationEvent).toBe('onFileSystem:memfs')
})

test('runtime removal is limited to one application', () => {
  const sourceRpc = {} as Rpc
  const previewRpc = {} as Rpc
  const defaultRpc = {} as Rpc
  Rpcs.set('sample', sourceRpc, 'source')
  Rpcs.set('sample', previewRpc, 'preview')
  Rpcs.set('sample', defaultRpc)
  expect(Rpcs.getAll('preview')).toEqual([previewRpc])
  expect(Rpcs.getIds('source')).toEqual(['sample'])

  expect(Rpcs.remove('sample', 'preview')).toBe(previewRpc)
  expect(Rpcs.get('sample', 'preview')).toBeUndefined()
  expect(Rpcs.get('sample', 'source')).toBe(sourceRpc)
  expect(Rpcs.get('sample')).toBe(defaultRpc)
})

test('a removed application cannot be revived by a stale state write', () => {
  ExtensionsState.createApplication('preview', 1, [])
  const saved = ExtensionsState.get('preview')
  ExtensionsState.removeApplication('preview')
  expect(() => ExtensionsState.set(saved)).toThrow('Extension application not found')
  expect(() => ExtensionsState.get('preview')).toThrow('Extension application not found')
  ExtensionsState.createApplication('preview', 1, [{ id: 'new-sample' }])
  expect(() => ExtensionsState.set(saved)).toThrow('Stale extension application state')
  expect(ExtensionsState.get('preview').webExtensions).toEqual([{ id: 'new-sample' }])
})

test('rejects duplicate applications without clearing the existing state', () => {
  ExtensionsState.createApplication('preview', 1, [{ id: 'sample' }])
  expect(() => ExtensionsState.createApplication('preview', 1, [])).toThrow('duplicate extension application')
  expect(ExtensionsState.get('preview').webExtensions).toEqual([{ id: 'sample' }])
})

test('runtime queries and removals tolerate an application with no worker registrations', () => {
  expect(Rpcs.getIds('preview')).toEqual([])
  expect(Rpcs.getAll('preview')).toEqual([])
  expect(Rpcs.remove('sample', 'preview')).toBeUndefined()
  expect(ExtensionsState.isCurrentApplication({})).toBe(true)
})

test('state updates cannot switch application identities', () => {
  ExtensionsState.createApplication('source', 1, [])
  expect(() => ExtensionsState.update({ applicationId: 'preview' } as any, 'source')).toThrow('Cannot change extension application identity')
  expect(() => ExtensionsState.update({ applicationGeneration: 99 } as any, 'source')).toThrow('Cannot change extension application identity')
  expect(ExtensionsState.get('source').webExtensions).toEqual([])
})
