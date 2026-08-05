import { afterEach, expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import * as DeclaredRpcState from '../src/parts/DeclaredRpcState/DeclaredRpcState.ts'
import * as LegacyNodeRpc from '../src/parts/LegacyNodeRpc/LegacyNodeRpc.ts'

afterEach(() => {
  DeclaredRpcState.clear()
  LegacyNodeRpc.clear()
})

test('binds compatibility proxy handles to the requesting extension', async () => {
  DeclaredRpcState.set({
    builtin: true,
    id: 'builtin.git',
    path: '/extensions/builtin.git',
    rpc: [{ id: 'git-client', name: 'Git', type: 'node', url: 'client.js' }],
  })
  using _mockRpc = RendererWorker.registerMockRpc({
    'ExtensionNodeRpc.create'(): number {
      return 99
    },
    'ExtensionNodeRpc.dispose'(): void {},
    'ExtensionNodeRpc.invoke'(): string {
      return 'ok'
    },
    'PlatformPaths.getBuiltinExtensionsPath'(): string {
      return '/extensions'
    },
  })

  const id = await LegacyNodeRpc.create('builtin.git', 'git-client')

  await expect(LegacyNodeRpc.invoke('builtin.git', id, 'Git.status')).resolves.toBe('ok')
  await expect(LegacyNodeRpc.invoke('other.extension', id, 'Git.status')).rejects.toThrow(`Node rpc ${id} not found`)
  await expect(LegacyNodeRpc.dispose('other.extension', id)).rejects.toThrow(`Node rpc ${id} not found`)
  await expect(LegacyNodeRpc.dispose('builtin.git', id)).resolves.toBeUndefined()
})
