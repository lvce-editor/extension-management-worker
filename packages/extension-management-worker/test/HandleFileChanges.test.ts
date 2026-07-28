import type { Rpc } from '@lvce-editor/rpc'
import { afterEach, expect, jest, test } from '@jest/globals'
import * as FileChangeHandlerRegistry from '../src/parts/FileChangeHandlerRegistry/FileChangeHandlerRegistry.ts'
import { handleFileChanges } from '../src/parts/HandleFileChanges/HandleFileChanges.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

type Invoke = (method: string, ...params: readonly unknown[]) => Promise<unknown>

const createRpc = (invoke: Rpc['invoke']): Rpc => {
  return {
    dispose: async () => {},
    invoke,
    invokeAndTransfer: async () => undefined,
    send: () => {},
  }
}

afterEach(() => {
  FileChangeHandlerRegistry.reset()
  IsolatedExtensionHostWorkerState.clear()
})

test('handleFileChanges invokes every registered extension worker with the same changes', async () => {
  const firstInvoke = jest.fn<Invoke>(async () => undefined)
  const secondInvoke = jest.fn<Invoke>(async () => undefined)
  IsolatedExtensionHostWorkerState.set('sample.first', createRpc(firstInvoke))
  IsolatedExtensionHostWorkerState.set('sample.second', createRpc(secondInvoke))
  FileChangeHandlerRegistry.register('sample.first')
  FileChangeHandlerRegistry.register('sample.second')
  const changes = {
    changed: ['file:///workspace/main.ts'],
    deleted: ['file:///workspace/old.ts'],
  }

  await handleFileChanges(changes)

  expect(firstInvoke).toHaveBeenCalledWith('ExtensionApi.handleFileChanges', changes)
  expect(secondInvoke).toHaveBeenCalledWith('ExtensionApi.handleFileChanges', changes)
})

test('handleFileChanges isolates handler failures', async () => {
  const successfulInvoke = jest.fn<Invoke>(async () => undefined)
  IsolatedExtensionHostWorkerState.set(
    'sample.failing',
    createRpc(async () => {
      throw new Error('listener failed')
    }),
  )
  IsolatedExtensionHostWorkerState.set('sample.successful', createRpc(successfulInvoke))
  FileChangeHandlerRegistry.register('sample.failing')
  FileChangeHandlerRegistry.register('sample.successful')

  await expect(handleFileChanges()).resolves.toBeUndefined()
  expect(successfulInvoke).toHaveBeenCalledTimes(1)
})

test('handleFileChanges removes registrations without a live worker', async () => {
  FileChangeHandlerRegistry.register('sample.missing')

  await handleFileChanges()

  expect(FileChangeHandlerRegistry.getRegisteredExtensionIds()).toEqual([])
})
