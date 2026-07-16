import type { Rpc } from '@lvce-editor/rpc'
import { afterEach, expect, jest, test } from '@jest/globals'
import * as DeclaredRpcState from '../src/parts/DeclaredRpcState/DeclaredRpcState.ts'
import * as GetOrCreateIsolatedExtensionHostWorker from '../src/parts/GetOrCreateIsolatedExtensionHostWorker/GetOrCreateIsolatedExtensionHostWorker.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const invokeAndTransferNoop = async (): Promise<void> => {}

afterEach(() => {
  DeclaredRpcState.clear()
  IsolatedExtensionHostWorkerState.clear()
})

test('createIsolatedExtensionHostWorker launches extension main entry', async () => {
  const launched: unknown[] = []
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async () => undefined,
    invokeAndTransfer: async () => undefined,
    send: () => {},
  }
  const createRpc = async (options: {
    readonly commandMap: any
    readonly isMessagePortOpen: boolean
    readonly send: (port: MessagePort) => Promise<void>
  }): Promise<Rpc> => {
    expect(options.commandMap['Extensions.getNodeRpcInfo']).toEqual(expect.any(Function))
    await options.send('port' as unknown as MessagePort)
    return rpc
  }
  const invokeAndTransfer = async (method: string, ...params: readonly unknown[]): Promise<void> => {
    launched.push(method, ...params)
  }

  await GetOrCreateIsolatedExtensionHostWorker.createIsolatedExtensionHostWorker(
    'sample.extension',
    '/remote/sample/main.js',
    'Sample Worker',
    createRpc,
    invokeAndTransfer,
  )

  expect(launched).toEqual([
    'LaunchIsolatedExtensionHostWorker.launchIsolatedExtensionHostWorker',
    'port',
    'sample.extension',
    '/remote/sample/main.js',
    'Sample Worker',
  ])
})

test('createIsolatedExtensionHostWorker launches extension main entry with fallback worker name', async () => {
  const launched: unknown[] = []
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async () => undefined,
    invokeAndTransfer: async () => undefined,
    send: () => {},
  }
  const createRpc = async (options: {
    readonly commandMap: any
    readonly isMessagePortOpen: boolean
    readonly send: (port: MessagePort) => Promise<void>
  }): Promise<Rpc> => {
    await options.send('port' as unknown as MessagePort)
    return rpc
  }
  const invokeAndTransfer = async (method: string, ...params: readonly unknown[]): Promise<void> => {
    launched.push(method, ...params)
  }

  await GetOrCreateIsolatedExtensionHostWorker.createIsolatedExtensionHostWorker(
    'sample.extension',
    '/remote/sample/main.js',
    '',
    createRpc,
    invokeAndTransfer,
  )

  expect(launched).toEqual([
    'LaunchIsolatedExtensionHostWorker.launchIsolatedExtensionHostWorker',
    'port',
    'sample.extension',
    '/remote/sample/main.js',
    '',
  ])
})

test('createIsolatedExtensionHostWorker keeps command handling scoped to each extension', async () => {
  DeclaredRpcState.set({
    id: 'builtin.git',
    path: '/extensions/builtin.git',
    rpc: [{ id: 'git-client', name: 'Git', type: 'node', url: 'node/gitClient.js' }],
  })
  DeclaredRpcState.set({
    id: 'builtin.prettier',
    path: '/extensions/builtin.prettier',
    rpc: [],
  })
  let globalCommandMap: Readonly<Record<string, (...args: readonly any[]) => any>> = {}
  const createRpc = async (options: {
    readonly commandMap: Readonly<Record<string, (...args: readonly any[]) => any>>
    readonly isMessagePortOpen: boolean
    readonly send: (port: MessagePort) => Promise<void>
  }) => {
    globalCommandMap = options.commandMap
    await options.send('port' as unknown as MessagePort)
    return {
      dispose: async () => {},
      invoke: async () => undefined,
      invokeAndTransfer: async () => undefined,
      ipc: {
        execute(method: string, ...params: readonly any[]): any {
          return globalCommandMap[method](...params)
        },
      },
      send: () => {},
    }
  }

  const gitRpc = await GetOrCreateIsolatedExtensionHostWorker.createIsolatedExtensionHostWorker(
    'builtin.git',
    '/extensions/builtin.git/gitMain.js',
    'Git',
    createRpc,
    invokeAndTransferNoop,
  )
  await GetOrCreateIsolatedExtensionHostWorker.createIsolatedExtensionHostWorker(
    'builtin.prettier',
    '/extensions/builtin.prettier/prettierMain.js',
    'Prettier',
    createRpc,
    invokeAndTransferNoop,
  )
  const { execute } = (gitRpc as Rpc & { ipc: { execute: (method: string, ...params: readonly any[]) => any } }).ipc

  await expect(execute('Extensions.getNodeRpcInfo', 'git-client')).resolves.toEqual({
    name: 'Git',
    path: '/extensions/builtin.git/node/gitClient.js',
  })
})

test('getOrCreateIsolatedExtensionHostWorker returns an existing rpc with default worker name', async () => {
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async () => undefined,
    invokeAndTransfer: async () => undefined,
    send: () => {},
  }
  IsolatedExtensionHostWorkerState.set('sample.extension', rpc)

  await expect(
    GetOrCreateIsolatedExtensionHostWorker.getOrCreateIsolatedExtensionHostWorker('sample.extension', '/remote/sample/main.js'),
  ).resolves.toBe(rpc)
})

test('getOrCreateIsolatedExtensionHostWorker shares an in-flight worker creation', async () => {
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async () => undefined,
    invokeAndTransfer: async () => undefined,
    send: () => {},
  }
  const { promise: creation, resolve: finishCreation } = Promise.withResolvers<Rpc>()
  const create = jest.fn(() => creation)

  const first = GetOrCreateIsolatedExtensionHostWorker.getOrCreateIsolatedExtensionHostWorker(
    'sample.extension',
    '/remote/sample/main.js',
    '',
    create,
  )
  const second = GetOrCreateIsolatedExtensionHostWorker.getOrCreateIsolatedExtensionHostWorker(
    'sample.extension',
    '/remote/sample/main.js',
    '',
    create,
  )

  expect(create).toHaveBeenCalledTimes(1)
  finishCreation(rpc)
  await expect(Promise.all([first, second])).resolves.toEqual([rpc, rpc])
})

test('getOrCreateIsolatedExtensionHostWorker retries after worker creation fails', async () => {
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async () => undefined,
    invokeAndTransfer: async () => undefined,
    send: () => {},
  }
  const create = jest.fn<() => Promise<Rpc>>().mockRejectedValueOnce(new Error('Failed to create worker')).mockResolvedValueOnce(rpc)

  await expect(
    GetOrCreateIsolatedExtensionHostWorker.getOrCreateIsolatedExtensionHostWorker('sample.extension', '/remote/sample/main.js', '', create),
  ).rejects.toThrow('Failed to create worker')
  await expect(
    GetOrCreateIsolatedExtensionHostWorker.getOrCreateIsolatedExtensionHostWorker('sample.extension', '/remote/sample/main.js', '', create),
  ).resolves.toBe(rpc)
  expect(create).toHaveBeenCalledTimes(2)
})
