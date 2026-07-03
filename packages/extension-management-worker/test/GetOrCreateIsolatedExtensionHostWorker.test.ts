import type { Rpc } from '@lvce-editor/rpc'
import { expect, test } from '@jest/globals'
import * as GetOrCreateIsolatedExtensionHostWorker from '../src/parts/GetOrCreateIsolatedExtensionHostWorker/GetOrCreateIsolatedExtensionHostWorker.ts'

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
