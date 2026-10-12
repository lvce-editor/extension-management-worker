import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import { commandMap } from '../src/parts/CommandMap/CommandMap.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'

const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch')

afterEach(() => {
  if (originalFetch) {
    Object.defineProperty(globalThis, 'fetch', originalFetch)
  } else {
    delete (globalThis as any).fetch
  }
})

beforeEach(() => {
  ExtensionsState.reset()
})

test('projects source control actions before returning the RPC response', async () => {
  const actions = { stage: { command: 'git.stage' } }
  const manifest = { description: 'Large unrelated metadata', id: 'git', 'source-control-actions': actions }
  using rpc = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions': async () => [manifest, { id: 'theme' }],
  })
  const query = commandMap['Extensions.getAllExtensions']
  const result = await query('/assets', PlatformType.Test, ['source-control-actions'])
  expect(structuredClone(result)).toEqual([{ 'source-control-actions': actions }, {}])
  expect(await query('/assets', PlatformType.Test)).toEqual([manifest, { id: 'theme' }])
  expect(await query('/assets', PlatformType.Test, [])).toEqual([{}, {}])
  expect(await query('/assets', PlatformType.Test, ['missing', 'toString'])).toEqual([{}, {}])
  expect(rpc.invocations).toEqual([
    ['ExtensionManagement.getAllExtensions', ['source-control-actions', 'id', 'disabled']],
    ['ExtensionManagement.getAllExtensions'],
  ])
})

test('projects resolved enablement state and dynamic extension metadata', async () => {
  ExtensionsState.set({ ...ExtensionsState.get(), disabledIds: ['git'], webExtensions: [{ id: 'dynamic', name: 'Dynamic' }] })
  using rpc = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions': async () => [{ disabled: false, id: 'git' }],
  })
  expect(await commandMap['Extensions.getAllExtensions']('/assets', PlatformType.Test, ['id', 'disabled'])).toEqual([
    { disabled: true, id: 'git' },
    { id: 'dynamic' },
  ])
  expect(rpc.invocations).toHaveLength(1)
})

test('rejects invalid field selectors', async () => {
  const query = commandMap['Extensions.getAllExtensions']
  await expect(query('/assets', PlatformType.Test, 'id' as any)).rejects.toThrow()
  await expect(query('/assets', PlatformType.Test, [1] as any)).rejects.toThrow()
})

test('reuses the static manifest while refreshing dynamic extension metadata', async () => {
  let fetchCount = 0
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (): Promise<Response> => {
      fetchCount++
      return {
        json: async () => [{ id: 'static' }],
        ok: true,
      } as Response
    },
  })
  const query = commandMap['Extensions.getAllExtensions']

  await expect(query('/dynamic-state-assets', PlatformType.Web)).resolves.toEqual([{ id: 'static' }])
  ExtensionsState.addExtension({ id: 'dynamic' })
  await expect(query('/dynamic-state-assets', PlatformType.Web)).resolves.toEqual([{ id: 'static' }, { id: 'dynamic' }])

  expect(fetchCount).toBe(1)
})

test('requests projection before shared-process transport while retaining identity for enablement', async () => {
  ExtensionsState.update({ disabledIds: ['git'] })
  let requestedFields: readonly string[] | undefined
  using rpc = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions': async (fields: readonly string[]) => {
      requestedFields = fields
      return [{ disabled: false, id: 'git', name: 'Git' }]
    },
  })
  expect(await commandMap['Extensions.getAllExtensions']('/assets', PlatformType.Test, ['name', 'disabled'])).toEqual([
    { disabled: true, name: 'Git' },
  ])
  expect(requestedFields).toEqual(['name', 'disabled', 'id'])
  expect(rpc.invocations).toHaveLength(1)
})

test('reuses projected discovery for concurrent reordered fields and subsets', async () => {
  using rpc = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions': async () => [{ id: 'sample', name: 'Sample' }],
  })
  const query = commandMap['Extensions.getAllExtensions']
  await expect(
    Promise.all([query('/assets', PlatformType.Test, ['name', 'id']), query('/assets', PlatformType.Test, ['id', 'name'])]),
  ).resolves.toEqual([[{ id: 'sample', name: 'Sample' }], [{ id: 'sample', name: 'Sample' }]])
  await expect(query('/assets', PlatformType.Test, ['id'])).resolves.toEqual([{ id: 'sample' }])
  expect(rpc.invocations).toHaveLength(1)
})

test('a projected cache cannot satisfy missing fields or a full-manifest request', async () => {
  const manifest = { description: 'Full metadata', id: 'sample', name: 'Sample' }
  using rpc = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions': async (fields?: readonly string[]) =>
      fields === undefined
        ? [manifest]
        : [
            Object.fromEntries(
              fields.filter((field) => Object.hasOwn(manifest, field)).map((field) => [field, manifest[field as keyof typeof manifest]]),
            ),
          ],
  })
  const query = commandMap['Extensions.getAllExtensions']
  await expect(query('/assets', PlatformType.Test, ['id'])).resolves.toEqual([{ id: 'sample' }])
  await expect(query('/assets', PlatformType.Test, ['name'])).resolves.toEqual([{ name: 'Sample' }])
  await expect(query('/assets', PlatformType.Test)).resolves.toEqual([manifest])
  await expect(query('/assets', PlatformType.Test, ['description'])).resolves.toEqual([{ description: 'Full metadata' }])
  expect(rpc.invocations).toHaveLength(3)
})
