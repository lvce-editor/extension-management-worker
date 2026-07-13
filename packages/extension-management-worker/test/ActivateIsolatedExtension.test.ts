import type { Rpc } from '@lvce-editor/rpc'
import { afterEach, expect, jest, test } from '@jest/globals'
import { activateIsolatedExtension } from '../src/parts/ActivateIsolatedExtension/ActivateIsolatedExtension.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as RuntimeStatusType from '../src/parts/RuntimeStatusType/RuntimeStatusType.ts'

afterEach(() => {
  ExtensionsState.reset()
})

test('records an isolated extension as activated', async () => {
  const getOrCreate = jest.fn<(extensionId: string, absolutePath: string, workerName?: string) => Promise<Rpc>>().mockResolvedValue({} as Rpc)

  await activateIsolatedExtension('sample.extension', '/extensions/sample/main.js', 'Sample Worker', 'onView:sample', getOrCreate)

  expect(getOrCreate).toHaveBeenCalledWith('sample.extension', '/extensions/sample/main.js', 'Sample Worker')
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
  const getOrCreate = jest.fn<(extensionId: string, absolutePath: string, workerName?: string) => Promise<Rpc>>().mockRejectedValue(error)

  await expect(
    activateIsolatedExtension('sample.extension', '/extensions/sample/main.js', 'Sample Worker', 'onView:sample', getOrCreate),
  ).rejects.toBe(error)
  expect(ExtensionsState.getRuntimeStatus('sample.extension')).toEqual(
    expect.objectContaining({
      activationEvent: 'onView:sample',
      id: 'sample.extension',
      status: RuntimeStatusType.Error,
    }),
  )
})
