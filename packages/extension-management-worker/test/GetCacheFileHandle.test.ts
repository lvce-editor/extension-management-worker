import type { Rpc } from '@lvce-editor/rpc'
import { expect, test } from '@jest/globals'
import { CacheWorker } from '@lvce-editor/rpc-registry'
import { createExtensionCommandMap } from '../src/parts/CreateExtensionCommandMap/CreateExtensionCommandMap.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { createIsolatedExtensionHostWorker } from '../src/parts/GetOrCreateIsolatedExtensionHostWorker/GetOrCreateIsolatedExtensionHostWorker.ts'

test('binds cache namespaces to the owning extension and preserves handles', async () => {
  const handle = { kind: 'file', name: 'files-v1' }
  using rpc = CacheWorker.registerMockRpc({
    'Opfs.getCacheFileHandle': () => handle,
  })
  const first = createExtensionCommandMap('sample.first')
  const second = createExtensionCommandMap('sample.second')
  expect(await first['Extensions.getCacheFileHandle']('files-v1', 'sample.second')).toBe(handle)
  await first['Extensions.getCacheFileHandle']('files-v1')
  await second['Extensions.getCacheFileHandle']('files-v1')
  const calls = rpc.invocations
  expect(calls[0]).toEqual(calls[1])
  expect(calls[0][0]).toBe('Opfs.getCacheFileHandle')
  expect(calls[0][1]).toMatch(/^extension-[a-f0-9]{64}$/)
  expect(calls[0][2]).toBe('files-v1')
  expect(calls[0][1]).not.toBe(calls[2][1])
})

test('application cache requests use the scoped router without accepting an owner argument', async () => {
  const calls: unknown[] = []
  const map = createExtensionCommandMap('runtime-id', (...args: readonly unknown[]) => {
    calls.push(args)
    return 'handle'
  })
  expect(await map['Extensions.getCacheFileHandle']('node-modules-v1', 'another-extension')).toBe('handle')
  expect(calls).toEqual([['Extensions.getCacheFileHandle', 'node-modules-v1']])
})

test('storage errors reach callers so they can use uncached reads', async () => {
  using rpc = CacheWorker.registerMockRpc({
    'Opfs.getCacheFileHandle': () => {
      throw new Error('storage unavailable')
    },
  })
  const map = createExtensionCommandMap('sample.extension')
  await expect(map['Extensions.getCacheFileHandle']('files-v1')).rejects.toThrow('storage unavailable')
  expect(rpc.invocations).toHaveLength(1)
})

test('application workers retain the extension namespace across generations and reject stale calls', async () => {
  using cache = CacheWorker.registerMockRpc({ 'Opfs.getCacheFileHandle': () => ({ kind: 'file' }) })
  const launch = async () => {
    const rpc = { ipc: { execute: (_method: string, ..._args: readonly any[]): any => undefined } }
    await createIsolatedExtensionHostWorker(
      'sample.extension',
      '/sample.js',
      '',
      '',
      async () => rpc as unknown as Rpc,
      async () => {},
      ExtensionsState.get('cache-test'),
    )
    return rpc
  }
  ExtensionsState.createApplication('cache-test', 1, [])
  try {
    const first = await launch()
    await first.ipc.execute('Extensions.getCacheFileHandle', 'files-v1')
    ExtensionsState.removeApplication('cache-test')
    ExtensionsState.createApplication('cache-test', 1, [])
    expect(() => first.ipc.execute('Extensions.getCacheFileHandle', 'files-v1')).toThrow('Stale extension application')
    const second = await launch()
    await second.ipc.execute('Extensions.getCacheFileHandle', 'files-v1')
    expect(cache.invocations).toHaveLength(2)
    expect(cache.invocations[0]).toEqual(cache.invocations[1])
  } finally {
    ExtensionsState.removeApplication('cache-test')
  }
})
