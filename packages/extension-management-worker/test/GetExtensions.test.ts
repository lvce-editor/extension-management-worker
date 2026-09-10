import { beforeEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import { commandMap } from '../src/parts/CommandMap/CommandMap.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'

beforeEach(() => {
  ExtensionsState.reset()
})

test('projects source control actions before returning the RPC response', async () => {
  const actions = { stage: { command: 'git.stage' } }
  const manifest = { id: 'git', description: 'Large unrelated metadata', 'source-control-actions': actions }
  using rpc = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions': async () => [manifest, { id: 'theme' }],
  })
  const query = commandMap['Extensions.getAllExtensions']
  const result = await query('/assets', PlatformType.Test, ['source-control-actions'])
  expect(structuredClone(result)).toEqual([{ 'source-control-actions': actions }, {}])
  expect(await query('/assets', PlatformType.Test)).toEqual([manifest, { id: 'theme' }])
  expect(await query('/assets', PlatformType.Test, [])).toEqual([{}, {}])
  expect(await query('/assets', PlatformType.Test, ['missing', 'toString'])).toEqual([{}, {}])
  expect(rpc.invocations).toHaveLength(4)
})

test('projects resolved enablement state and dynamic extension metadata', async () => {
  ExtensionsState.set({ ...ExtensionsState.get(), disabledIds: ['git'], webExtensions: [{ id: 'dynamic', name: 'Dynamic' }] })
  using rpc = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions': async () => [{ id: 'git', disabled: false }],
  })
  expect(await commandMap['Extensions.getAllExtensions']('/assets', PlatformType.Test, ['id', 'disabled'])).toEqual([
    { id: 'git', disabled: true },
    { id: 'dynamic' },
  ])
  expect(rpc.invocations).toHaveLength(1)
})

test('rejects invalid field selectors', async () => {
  const query = commandMap['Extensions.getAllExtensions']
  await expect(query('/assets', PlatformType.Test, 'id' as any)).rejects.toThrow()
  await expect(query('/assets', PlatformType.Test, [1] as any)).rejects.toThrow()
})
