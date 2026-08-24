import { expect, jest, test } from '@jest/globals'
import { restartLinkedExtension } from '../src/parts/RestartLinkedExtension/RestartLinkedExtension.ts'

test('restartLinkedExtension - saves view state, restarts the runtime, restores the view, and rerenders it', async () => {
  const rpc = {
    invoke: jest.fn(async () => ({ selected: 2 })),
  } as any
  const dependencies = {
    activateByEvent: jest.fn(async (_event: string, _assetDir: string, _platform: number) => ({ error: undefined, hasActivatedExtensions: true })),
    createViewInstance: jest.fn(async (_viewId: string, _uid: number, _context: unknown, _assetDir: string, _platform: number) => ({
      ok: true as const,
      result: [],
    })),
    disposeExtensionRuntime: jest.fn(async (_extensionId: string) => true),
    getRpc: jest.fn((_extensionId: string) => rpc),
    getRuntimeStatus: jest.fn((_extensionId: string) => ({ activationEvent: 'onView:sample.view' }) as any),
    getViewEntries: jest.fn(() => [
      {
        instance: {
          context: { uri: 'file:///sample.txt' },
          rpc,
          status: 'ready' as const,
          viewId: 'sample.view',
        },
        uid: 7,
      },
    ]),
    removeViewInstance: jest.fn((_uid: number) => {}),
    requestViewRerender: jest.fn(async (_uid: number) => {}),
  }

  await expect(restartLinkedExtension({ id: 'sample.extension' }, '/assets', 2, dependencies)).resolves.toBe(true)

  expect(rpc.invoke).toHaveBeenCalledWith('ExtensionApi.saveViewInstanceState', 7)
  expect(dependencies.removeViewInstance).toHaveBeenCalledWith(7)
  expect(dependencies.disposeExtensionRuntime).toHaveBeenCalledWith('sample.extension')
  expect(dependencies.activateByEvent).toHaveBeenCalledWith('onView:sample.view', '/assets', 2)
  expect(dependencies.createViewInstance).toHaveBeenCalledWith('sample.view', 7, { state: { selected: 2 }, uri: 'file:///sample.txt' }, '/assets', 2)
  expect(dependencies.requestViewRerender).toHaveBeenCalledWith(7)
})

test('restartLinkedExtension - leaves an extension that is not running alone', async () => {
  const dependencies = {
    activateByEvent: jest.fn(),
    createViewInstance: jest.fn(),
    disposeExtensionRuntime: jest.fn(),
    getRpc: jest.fn(() => undefined),
    getRuntimeStatus: jest.fn(),
    getViewEntries: jest.fn(),
    removeViewInstance: jest.fn(),
    requestViewRerender: jest.fn(),
  }

  await expect(restartLinkedExtension({ id: 'sample.extension' }, '/assets', 2, dependencies as any)).resolves.toBe(false)

  expect(dependencies.disposeExtensionRuntime).not.toHaveBeenCalled()
})

test('restartLinkedExtension - continues without saved state when saving fails', async () => {
  const rpc = {
    invoke: jest.fn(async () => {
      throw new Error('save failed')
    }),
  } as any
  const dependencies = {
    activateByEvent: jest.fn(),
    createViewInstance: jest.fn(async (_viewId: string, _uid: number, _context: unknown, _assetDir: string, _platform: number) => ({
      error: { message: 'create failed', name: 'Error' },
      ok: false as const,
    })),
    disposeExtensionRuntime: jest.fn(async () => true),
    getRpc: jest.fn(() => rpc),
    getRuntimeStatus: jest.fn(() => undefined),
    getViewEntries: jest.fn(() => [
      {
        instance: {
          rpc,
          status: 'ready' as const,
          viewId: 'sample.view',
        },
        uid: 8,
      },
    ]),
    removeViewInstance: jest.fn(),
    requestViewRerender: jest.fn(),
  }

  await expect(restartLinkedExtension({ id: 'sample.extension' }, '/assets', 2, dependencies as any)).resolves.toBe(true)

  expect(dependencies.activateByEvent).not.toHaveBeenCalled()
  expect(dependencies.createViewInstance).toHaveBeenCalledWith('sample.view', 8, { state: undefined }, '/assets', 2)
  expect(dependencies.requestViewRerender).not.toHaveBeenCalled()
})
