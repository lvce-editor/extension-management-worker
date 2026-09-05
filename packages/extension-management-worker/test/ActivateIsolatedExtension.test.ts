import type { Rpc } from '@lvce-editor/rpc'
import { afterEach, expect, jest, test } from '@jest/globals'
import { activateIsolatedExtension } from '../src/parts/ActivateIsolatedExtension/ActivateIsolatedExtension.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as RuntimeStatusType from '../src/parts/RuntimeStatusType/RuntimeStatusType.ts'

afterEach(() => {
  ExtensionsState.reset()
  ExtensionsState.removeApplication('preview')
})

test('records activation status only in the target application', async () => {
  ExtensionsState.createApplication('preview', 1, [])
  const worker = {} as Rpc
  const create = jest.fn(async (..._args: readonly unknown[]) => worker)
  expect(await activateIsolatedExtension('sample', '/main.js', '', '', 'onFileSystem:memfs', create, 'preview')).toBe(worker)
  expect(create).toHaveBeenCalledWith('sample', '/main.js', '', '', undefined, 'preview')
  expect(ExtensionsState.getRuntimeStatus('sample')).toBeUndefined()
  expect(ExtensionsState.getRuntimeStatus('sample', 'preview')?.status).toBe(RuntimeStatusType.Activated)
})

test('records an application activation failure without touching default status', async () => {
  ExtensionsState.createApplication('preview', 1, [])
  await expect(
    activateIsolatedExtension(
      'sample',
      '/main.js',
      '',
      '',
      '',
      async () => {
        throw new Error('failed')
      },
      'preview',
    ),
  ).rejects.toThrow('failed')
  expect(ExtensionsState.getRuntimeStatus('sample', 'preview')?.status).toBe(RuntimeStatusType.Error)
  expect(ExtensionsState.getRuntimeStatus('sample')).toBeUndefined()
})

test('a replaced application cannot receive late activation status', async () => {
  ExtensionsState.createApplication('preview', 1, [])
  const gate = Promise.withResolvers<Rpc>()
  const activating = activateIsolatedExtension('sample', '/main.js', '', '', '', async () => gate.promise, 'preview')
  const result = Promise.allSettled([activating])
  ExtensionsState.removeApplication('preview')
  ExtensionsState.createApplication('preview', 1, [])
  gate.resolve({} as Rpc)
  expect(await result).toEqual([{ reason: expect.objectContaining({ message: 'Stale extension application: preview' }), status: 'rejected' }])
  expect(ExtensionsState.getRuntimeStatus('sample', 'preview')).toBeUndefined()
})

test('records an isolated extension as activated', async () => {
  const getOrCreate = jest
    .fn<(extensionId: string, absolutePath: string, workerName?: string, contentSecurityPolicy?: string) => Promise<Rpc>>()
    .mockResolvedValue({} as Rpc)

  await activateIsolatedExtension(
    'sample.extension',
    '/extensions/sample/main.js',
    'Sample Worker',
    `default-src 'none';`,
    'onView:sample',
    getOrCreate,
  )

  expect(getOrCreate).toHaveBeenCalledWith('sample.extension', '/extensions/sample/main.js', 'Sample Worker', `default-src 'none';`)
  expect(ExtensionsState.getRuntimeStatus('sample.extension')).toEqual(
    expect.objectContaining({
      activationEvent: 'onView:sample',
      id: 'sample.extension',
      status: RuntimeStatusType.Activated,
    }),
  )
})

test('records an isolated extension activation error', async () => {
  const error = new Error('Failed to launch worker')
  const getOrCreate = jest
    .fn<(extensionId: string, absolutePath: string, workerName?: string, contentSecurityPolicy?: string) => Promise<Rpc>>()
    .mockRejectedValue(error)

  await expect(
    activateIsolatedExtension('sample.extension', '/extensions/sample/main.js', 'Sample Worker', '', 'onView:sample', getOrCreate),
  ).rejects.toBe(error)
  expect(ExtensionsState.getRuntimeStatus('sample.extension')).toEqual(
    expect.objectContaining({
      activationEvent: 'onView:sample',
      error: 'Failed to launch worker',
      id: 'sample.extension',
      status: RuntimeStatusType.Error,
    }),
  )
})
