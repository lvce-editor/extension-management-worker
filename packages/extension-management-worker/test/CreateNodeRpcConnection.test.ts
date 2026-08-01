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

const declareRpc = (): void => {
  DeclaredRpcState.set({
    builtin: true,
    id: 'builtin.git',
    path: '/extensions/builtin.git',
    rpc: [{ id: 'git-client', name: 'Git', type: 'node', url: 'client.js' }],
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
    'PlatformPaths.getBuiltinExtensionsPath'(): string {
      return '/extensions'
    },
  })

  await expect(createNodeRpcConnection('builtin.git', 'git-client')).resolves.toEqual({
    protocols: ['lvce-rpc', 'lvce-capability.token'],
    type: 'websocket',
    url: 'wss://example.com/websocket/capability',
  })
  expect(invocations).toEqual([['builtin.git', 'git-client', '/extensions/builtin.git/client.js']])
})

test('uses the bound legacy proxy only when the new renderer command is missing', async () => {
  declareRpc()
  ExtensionsState.setPlatform(PlatformType.Remote)
  using _mockRpc = RendererWorker.registerMockRpc({
    'ExtensionNodeRpc.createConnection'(): never {
      throw new Error('Command not found ExtensionNodeRpc.createConnection')
    },
    'PlatformPaths.getBuiltinExtensionsPath'(): string {
      return '/extensions'
    },
  })

  await expect(createNodeRpcConnection('builtin.git', 'git-client')).resolves.toEqual({ type: 'legacy-proxy' })
})

test('uses the bound legacy proxy when an older renderer has no node rpc module', async () => {
  declareRpc()
  ExtensionsState.setPlatform(PlatformType.Remote)
  using _mockRpc = RendererWorker.registerMockRpc({
    'ExtensionNodeRpc.createConnection'(): never {
      throw new Error('module ExtensionNodeRpc not found')
    },
    'PlatformPaths.getBuiltinExtensionsPath'(): string {
      return '/extensions'
    },
  })

  await expect(createNodeRpcConnection('builtin.git', 'git-client')).resolves.toEqual({ type: 'legacy-proxy' })
})

test('does not downgrade other capability errors', async () => {
  declareRpc()
  ExtensionsState.setPlatform(PlatformType.Remote)
  using _mockRpc = RendererWorker.registerMockRpc({
    'ExtensionNodeRpc.createConnection'(): never {
      throw new Error('Capability issuer rejected')
    },
    'PlatformPaths.getBuiltinExtensionsPath'(): string {
      return '/extensions'
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
    'PlatformPaths.getBuiltinExtensionsPath'(): string {
      return '/extensions'
    },
  })

  await expect(createNodeRpcConnection('builtin.git', 'git-client')).resolves.toEqual({ type: 'message-port' })
})

test('uses the legacy proxy when direct Electron connections are unsupported', async () => {
  declareRpc()
  ExtensionsState.setPlatform(PlatformType.Electron)
  using _mockRpc = RendererWorker.registerMockRpc({
    'ExtensionNodeRpc.supportsDirectConnection'(): boolean {
      return false
    },
    'PlatformPaths.getBuiltinExtensionsPath'(): string {
      return '/extensions'
    },
  })

  await expect(createNodeRpcConnection('builtin.git', 'git-client')).resolves.toEqual({ type: 'legacy-proxy' })
})

test('uses the legacy proxy when the direct Electron command is missing', async () => {
  declareRpc()
  ExtensionsState.setPlatform(PlatformType.Electron)
  using _mockRpc = RendererWorker.registerMockRpc({
    'ExtensionNodeRpc.supportsDirectConnection'(): never {
      throw new Error('Command not found ExtensionNodeRpc.supportsDirectConnection')
    },
    'PlatformPaths.getBuiltinExtensionsPath'(): string {
      return '/extensions'
    },
  })

  await expect(createNodeRpcConnection('builtin.git', 'git-client')).resolves.toEqual({ type: 'legacy-proxy' })
})

test('does not downgrade other Electron renderer errors', async () => {
  declareRpc()
  ExtensionsState.setPlatform(PlatformType.Electron)
  using _mockRpc = RendererWorker.registerMockRpc({
    'ExtensionNodeRpc.supportsDirectConnection'(): never {
      throw new Error('renderer unavailable')
    },
    'PlatformPaths.getBuiltinExtensionsPath'(): string {
      return '/extensions'
    },
  })

  await expect(createNodeRpcConnection('builtin.git', 'git-client')).rejects.toThrow('renderer unavailable')
})

test('rejects node rpc connections on unsupported platforms', async () => {
  declareRpc()
  ExtensionsState.setPlatform(PlatformType.Web)
  using _mockRpc = RendererWorker.registerMockRpc({
    'PlatformPaths.getBuiltinExtensionsPath'(): string {
      return '/extensions'
    },
  })

  await expect(createNodeRpcConnection('builtin.git', 'git-client')).rejects.toThrow('not available on this platform')
})

test('transfers approved Electron node rpc ports', async () => {
  declareRpc()
  ExtensionsState.setPlatform(PlatformType.Electron)
  const { port1, port2 } = new MessageChannel()
  using mockRpc = RendererWorker.registerMockRpc({
    'ExtensionNodeRpc.createMessagePort'(): void {},
    'PlatformPaths.getBuiltinExtensionsPath'(): string {
      return '/extensions'
    },
  })

  await expect(createNodeRpcMessagePort('builtin.git', 'git-client', port1)).resolves.toBeUndefined()
  expect(mockRpc.invocations).toEqual([
    ['PlatformPaths.getBuiltinExtensionsPath'],
    ['ExtensionNodeRpc.createMessagePort', port1, '/extensions/builtin.git/client.js'],
  ])
  port2.close()
})

test('rejects node rpc ports outside Electron', async () => {
  ExtensionsState.setPlatform(PlatformType.Remote)
  const { port1, port2 } = new MessageChannel()

  await expect(createNodeRpcMessagePort('builtin.git', 'git-client', port1)).rejects.toThrow('only available in Electron')
  port1.close()
  port2.close()
})
