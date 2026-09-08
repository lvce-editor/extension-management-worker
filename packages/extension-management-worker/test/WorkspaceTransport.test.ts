import type { Rpc } from '@lvce-editor/rpc'
import { afterEach, expect, jest, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import { createNodeRpcConnection, createNodeRpcMessagePort } from '../src/parts/CreateNodeRpcConnection/CreateNodeRpcConnection.ts'
import * as DeclaredRpcState from '../src/parts/DeclaredRpcState/DeclaredRpcState.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'
import * as WorkspaceTransport from '../src/parts/WorkspaceTransport/WorkspaceTransport.ts'

const uri = 'remote-ssh://host/work'
const transport = {
  id: 'builtin.remote-ssh',
  isolated: true,
  workspaceTransport: { command: 'remote-ssh.connectToProcess', scheme: 'remote-ssh' },
}

const declareRpc = (onRemote?: 'runOnRemote'): void => {
  DeclaredRpcState.set({ id: 'builtin.git', rpc: [{ id: 'git-client', onRemote, type: 'node-process', url: 'client.js' }] })
}

afterEach(() => {
  ExtensionsState.reset()
  DeclaredRpcState.clear()
  IsolatedExtensionHostWorkerState.clear()
})

test('only an opted-in node RPC uses a remote workspace port', async () => {
  ExtensionsState.setPlatform(PlatformType.Remote)
  using renderer = RendererWorker.registerMockRpc({
    'Workspace.getUri': () => uri,
    'ExtensionNodeRpc.createConnection': () => ({ protocols: [], url: 'ws://local/node' }),
  })
  declareRpc()
  await expect(createNodeRpcConnection('builtin.git', 'git-client')).resolves.toMatchObject({ type: 'websocket', url: 'ws://local/node' })
  expect(renderer.invocations).not.toContainEqual(['Workspace.getUri'])
  declareRpc('runOnRemote')
  await expect(createNodeRpcConnection('builtin.git', 'git-client')).resolves.toEqual({ type: 'message-port' })
})

test('an opted-in RPC stays local in a file workspace', async () => {
  ExtensionsState.setPlatform(PlatformType.Electron)
  declareRpc('runOnRemote')
  using renderer = RendererWorker.registerMockRpc({
    'Workspace.getUri': () => 'file:///work',
    'ExtensionNodeRpc.supportsDirectConnection': () => true,
    'ExtensionNodeRpc.createMessagePort': () => {},
  })
  const { port1, port2 } = new MessageChannel()
  try {
    await createNodeRpcConnection('builtin.git', 'git-client')
    await createNodeRpcMessagePort('builtin.git', 'git-client', port1)
    expect(renderer.invocations).toContainEqual(['ExtensionNodeRpc.createMessagePort', port1, 'builtin.git', 'git-client'])
  } finally {
    port1.close()
    port2.close()
  }
})

test('transfers the bound extension identity and port directly to its workspace transport', async () => {
  ExtensionsState.setPlatform(PlatformType.Test)
  ExtensionsState.setWebExtensions([transport])
  declareRpc('runOnRemote')
  using renderer = RendererWorker.registerMockRpc({ 'Layout.getAssetDir': () => '/assets', 'Workspace.getUri': () => uri })
  using _shared = SharedProcess.registerMockRpc({ 'ExtensionManagement.getAllExtensions': () => [] })
  const invokeAndTransfer = jest.fn<Rpc['invokeAndTransfer']>(async () => {})
  IsolatedExtensionHostWorkerState.set(transport.id, { dispose: async () => {}, invoke: async () => {}, invokeAndTransfer, send: () => {} })
  const { port1, port2 } = new MessageChannel()
  try {
    await expect(WorkspaceTransport.getWorkspaceTransportUri()).resolves.toBe(uri)
    await createNodeRpcMessagePort('builtin.git', 'git-client', port1)
    expect(invokeAndTransfer).toHaveBeenCalledWith(
      'ExtensionApi.executeCommand',
      transport.workspaceTransport.command,
      uri,
      'extension-node-process',
      port1,
      { extensionId: 'builtin.git', rpcId: 'git-client' },
    )
    expect(renderer.invocations.every(([method]) => method !== 'ExtensionNodeRpc.createMessagePort')).toBe(true)
  } finally {
    port1.close()
    port2.close()
  }
})

test('rejects a disabled transport without falling back to a local process', async () => {
  ExtensionsState.setPlatform(PlatformType.Test)
  ExtensionsState.setWebExtensions([{ ...transport, disabled: true }])
  declareRpc('runOnRemote')
  using _renderer = RendererWorker.registerMockRpc({ 'Layout.getAssetDir': () => '/assets', 'Workspace.getUri': () => uri })
  using _shared = SharedProcess.registerMockRpc({ 'ExtensionManagement.getAllExtensions': () => [] })
  const { port1, port2 } = new MessageChannel()
  try {
    await expect(WorkspaceTransport.getWorkspaceTransportUri()).resolves.toBe('')
    await expect(createNodeRpcMessagePort('builtin.git', 'git-client', port1)).rejects.toThrow('No workspace transport')
  } finally {
    port1.close()
    port2.close()
  }
})

test('rejects a port transfer after switching workspaces', async () => {
  ExtensionsState.setPlatform(PlatformType.Test)
  ExtensionsState.setWebExtensions([transport])
  using _renderer = RendererWorker.registerMockRpc({ 'Layout.getAssetDir': () => '/assets', 'Workspace.getUri': () => 'remote-ssh://other/work' })
  using _shared = SharedProcess.registerMockRpc({ 'ExtensionManagement.getAllExtensions': () => [] })
  const invokeAndTransfer = jest.fn<Rpc['invokeAndTransfer']>(async () => {})
  IsolatedExtensionHostWorkerState.set(transport.id, { dispose: async () => {}, invoke: async () => {}, invokeAndTransfer, send: () => {} })
  const { port1, port2 } = new MessageChannel()
  try {
    await expect(WorkspaceTransport.connectTerminal(uri, port1)).rejects.toThrow('Workspace changed')
    expect(invokeAndTransfer).not.toHaveBeenCalled()
  } finally {
    port1.close()
    port2.close()
  }
})
