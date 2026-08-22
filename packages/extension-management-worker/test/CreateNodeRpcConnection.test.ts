import { afterEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { createNodeRpcConnection, createNodeRpcMessagePort } from '../src/parts/CreateNodeRpcConnection/CreateNodeRpcConnection.ts'
import * as DeclaredRpcState from '../src/parts/DeclaredRpcState/DeclaredRpcState.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'

afterEach(() => {
  DeclaredRpcState.clear()
  ExtensionsState.reset()
})

const declareRpc = (type: 'node' | 'node-process' = 'node-process', builtin = true): void => {
  DeclaredRpcState.set({
    builtin,
    id: 'builtin.git',
    path: '/extensions/builtin.git',
    rpc: [{ id: 'git-client', name: 'Git', type, url: 'client.js' }],
  })
}

test('creates a remote capability for the calling extension and declared rpc', async () => {
  declareRpc()
  ExtensionsState.setPlatform(PlatformType.Remote)
  const invocations: unknown[][] = []
  using _mockRpc = RendererWorker.registerMockRpc({
    'ExtensionNodeRpc.createConnection'(...args: readonly unknown[]): unknown {
      invocations.push([...args])
      return { protocols: ['lvce-rpc', 'lvce-capability.token'], url: 'wss://example.com/websocket/capability' }
    },
  })

  await expect(createNodeRpcConnection('builtin.git', 'git-client')).resolves.toEqual({
    protocols: ['lvce-rpc', 'lvce-capability.token'],
    type: 'websocket',
    url: 'wss://example.com/websocket/capability',
  })
  expect(invocations).toEqual([['builtin.git', 'git-client']])
})

test('uses the bound legacy proxy for legacy node declarations', async () => {
  declareRpc('node')
  ExtensionsState.setPlatform(PlatformType.Remote)

  await expect(createNodeRpcConnection('builtin.git', 'git-client')).resolves.toEqual({ type: 'legacy-proxy' })
})

test('rejects a node process when the remote renderer command is missing', async () => {
  declareRpc()
  ExtensionsState.setPlatform(PlatformType.Remote)
  using _mockRpc = RendererWorker.registerMockRpc({
    'ExtensionNodeRpc.createConnection'(): never {
      throw new Error('Command not found ExtensionNodeRpc.createConnection')
    },
  })

  await expect(createNodeRpcConnection('builtin.git', 'git-client')).rejects.toThrow('requires direct renderer support')
})

test('rejects a node process when an older remote renderer has no node rpc module', async () => {
  declareRpc()
  ExtensionsState.setPlatform(PlatformType.Remote)
  using _mockRpc = RendererWorker.registerMockRpc({
    'ExtensionNodeRpc.createConnection'(): never {
      throw new Error('module ExtensionNodeRpc not found')
    },
  })

  await expect(createNodeRpcConnection('builtin.git', 'git-client')).rejects.toThrow('requires direct renderer support')
})

test('does not downgrade other capability errors', async () => {
  declareRpc()
  ExtensionsState.setPlatform(PlatformType.Remote)
  using _mockRpc = RendererWorker.registerMockRpc({
    'ExtensionNodeRpc.createConnection'(): never {
      throw new Error('Capability issuer rejected')
    },
  })

  await expect(createNodeRpcConnection('builtin.git', 'git-client')).rejects.toThrow('Capability issuer rejected')
})

test('uses direct message ports only when the Electron renderer supports them', async () => {
  declareRpc()
  ExtensionsState.setPlatform(PlatformType.Electron)
  using _mockRpc = RendererWorker.registerMockRpc({
    'ExtensionNodeRpc.supportsDirectConnection'(): boolean {
      return true
    },
  })

  await expect(createNodeRpcConnection('builtin.git', 'git-client')).resolves.toEqual({ type: 'message-port' })
})

test('rejects a node process when direct Electron connections are unsupported', async () => {
  declareRpc()
  ExtensionsState.setPlatform(PlatformType.Electron)
  using _mockRpc = RendererWorker.registerMockRpc({
    'ExtensionNodeRpc.supportsDirectConnection'(): boolean {
      return false
    },
  })

  await expect(createNodeRpcConnection('builtin.git', 'git-client')).rejects.toThrow('requires direct renderer support')
})

test('rejects a node process when the direct Electron command is missing', async () => {
  declareRpc()
  ExtensionsState.setPlatform(PlatformType.Electron)
  using _mockRpc = RendererWorker.registerMockRpc({
    'ExtensionNodeRpc.supportsDirectConnection'(): never {
      throw new Error('Command not found ExtensionNodeRpc.supportsDirectConnection')
    },
  })

  await expect(createNodeRpcConnection('builtin.git', 'git-client')).rejects.toThrow('requires direct renderer support')
})

test('does not downgrade other Electron renderer errors', async () => {
  declareRpc()
  ExtensionsState.setPlatform(PlatformType.Electron)
  using _mockRpc = RendererWorker.registerMockRpc({
    'ExtensionNodeRpc.supportsDirectConnection'(): never {
      throw new Error('renderer unavailable')
    },
  })

  await expect(createNodeRpcConnection('builtin.git', 'git-client')).rejects.toThrow('renderer unavailable')
})

test('rejects node rpc connections on unsupported platforms', async () => {
  declareRpc()
  ExtensionsState.setPlatform(PlatformType.Web)
  await expect(createNodeRpcConnection('builtin.git', 'git-client')).rejects.toThrow('not available on this platform')
})

test('allows third-party node processes without an approval prompt', async () => {
  declareRpc('node-process', false)
  ExtensionsState.setPlatform(PlatformType.Remote)
  using _mockRpc = RendererWorker.registerMockRpc({
    'ExtensionNodeRpc.createConnection'(): unknown {
      return { protocols: ['lvce-rpc', 'lvce-capability.token'], url: 'wss://example.com/websocket/capability' }
    },
  })

  await expect(createNodeRpcConnection('builtin.git', 'git-client')).resolves.toMatchObject({ type: 'websocket' })
})

test('transfers approved Electron node rpc ports', async () => {
  declareRpc()
  ExtensionsState.setPlatform(PlatformType.Electron)
  const { port1, port2 } = new MessageChannel()
  using mockRpc = RendererWorker.registerMockRpc({
    'ExtensionNodeRpc.createMessagePort'(): void {},
  })

  await expect(createNodeRpcMessagePort('builtin.git', 'git-client', port1)).resolves.toBeUndefined()
  expect(mockRpc.invocations).toEqual([['ExtensionNodeRpc.createMessagePort', port1, 'builtin.git', 'git-client']])
  port2.close()
})

test('rejects direct Electron ports for legacy node declarations', async () => {
  declareRpc('node')
  ExtensionsState.setPlatform(PlatformType.Electron)
  const { port1, port2 } = new MessageChannel()

  await expect(createNodeRpcMessagePort('builtin.git', 'git-client', port1)).rejects.toThrow('is not a node process')
  port1.close()
  port2.close()
})

test('rejects node rpc ports outside Electron', async () => {
  ExtensionsState.setPlatform(PlatformType.Remote)
  const { port1, port2 } = new MessageChannel()

  await expect(createNodeRpcMessagePort('builtin.git', 'git-client', port1)).rejects.toThrow('only available in Electron')
  port1.close()
  port2.close()
})
