import { afterEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import * as DeclaredRpcState from '../src/parts/DeclaredRpcState/DeclaredRpcState.ts'
import { getNodeRpcInfo, getNodeRpcPath, getNodeRpcType } from '../src/parts/GetNodeRpcPath/GetNodeRpcPath.ts'
import { handleRpcInfos } from '../src/parts/HandleRpcInfos/HandleRpcInfos.ts'

afterEach(() => {
  DeclaredRpcState.clear()
})

test('resolves a builtin node rpc from the physical builtin extensions path', async () => {
  const rendererWorker = RendererWorker.registerMockRpc({
    'PlatformPaths.getBuiltinExtensionsPath'(): string {
      return '/usr/lib/lvce/resources/app/static/hash/extensions'
    },
  })
  try {
    handleRpcInfos(
      {
        builtin: true,
        id: 'builtin.git',
        path: '/hash/extensions/builtin.git',
        rpc: [{ id: 'git-client', name: 'Git', type: 'node', url: './node/src/gitClient.js' }],
      },
      PlatformType.Electron,
    )

    await expect(getNodeRpcInfo('builtin.git', 'git-client')).resolves.toEqual({
      name: 'Git',
      path: '/usr/lib/lvce/resources/app/static/hash/extensions/builtin.git/node/src/gitClient.js',
    })
  } finally {
    rendererWorker[Symbol.dispose]()
  }
})

test('resolves a node rpc from a local extension path', async () => {
  const rendererWorker = RendererWorker.registerMockRpc({
    'PlatformPaths.getBuiltinExtensionsPath'(): string {
      return '/workspace/git/packages'
    },
  })
  DeclaredRpcState.set({
    builtin: true,
    id: 'builtin.git',
    path: '/workspace/git/packages/extension',
    rpc: [{ id: 'git-client', type: 'node', url: '../node/src/gitClient.js' }],
  })

  try {
    await expect(getNodeRpcPath('builtin.git', 'git-client')).resolves.toBe('/workspace/git/packages/builtin.git/../node/src/gitClient.js')
  } finally {
    rendererWorker[Symbol.dispose]()
  }
})

test('normalizes a windows builtin extension path', async () => {
  const rendererWorker = RendererWorker.registerMockRpc({
    'PlatformPaths.getBuiltinExtensionsPath'(): string {
      return 'D:\\app\\extensions'
    },
  })
  DeclaredRpcState.set({
    builtin: true,
    id: 'builtin.git',
    rpc: [{ id: 'git-client', type: 'node', url: '../node/src/gitClient.js' }],
  })

  try {
    await expect(getNodeRpcPath('builtin.git', 'git-client')).resolves.toBe('D:/app/extensions/builtin.git/../node/src/gitClient.js')
  } finally {
    rendererWorker[Symbol.dispose]()
  }
})

test('rejects an undeclared node rpc', async () => {
  DeclaredRpcState.set({ builtin: true, id: 'sample.extension', path: '/extensions/sample', rpc: [] })

  await expect(getNodeRpcPath('sample.extension', 'missing')).rejects.toThrow('Node rpc missing is not declared by extension sample.extension')
})

test('rejects a non-node rpc', async () => {
  DeclaredRpcState.set({
    builtin: true,
    id: 'sample.extension',
    path: '/extensions/sample',
    rpc: [{ id: 'sample-worker', type: 'web-worker', url: 'worker.js' }],
  })

  await expect(getNodeRpcPath('sample.extension', 'sample-worker')).rejects.toThrow(
    'Rpc sample-worker declared by extension sample.extension is not a node rpc',
  )
})

test('rejects an absolute node rpc url', async () => {
  DeclaredRpcState.set({
    builtin: true,
    id: 'sample.extension',
    path: '/extensions/sample',
    rpc: [{ id: 'sample-worker', type: 'node', url: 'file:///tmp/worker.js' }],
  })

  await expect(getNodeRpcPath('sample.extension', 'sample-worker')).rejects.toThrow(
    'Node rpc sample-worker declared by extension sample.extension must use a relative url',
  )
})

test('resolves a node process rpc from a third-party extension without prompting', async () => {
  DeclaredRpcState.set({
    id: 'third-party.extension',
    path: '/extensions/third-party',
    rpc: [{ id: 'client', type: 'node-process', url: 'client.js' }],
  })

  await expect(getNodeRpcInfo('third-party.extension', 'client')).resolves.toEqual({
    name: '',
    path: '/extensions/third-party/client.js',
  })
  expect(getNodeRpcType('third-party.extension', 'client')).toBe('node-process')
})
