import { beforeEach, expect, jest, test } from '@jest/globals'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { getRuntimeStatus } from '../src/parts/GetRuntimeStatus/GetRuntimeStatus.ts'
import * as RuntimeStatusType from '../src/parts/RuntimeStatusType/RuntimeStatusType.ts'

beforeEach(() => {
  ExtensionsState.reset()
})

test('includes memory usage for an activated extension', async () => {
  ExtensionsState.updateRuntimeStatus('sample.extension', {
    activationEvent: 'onCommand:sample',
    status: RuntimeStatusType.Activated,
  })
  const getMemoryUsage = jest.fn<(extensionId: string) => Promise<number>>(async () => 4096)

  await expect(getRuntimeStatus('sample.extension', getMemoryUsage)).resolves.toEqual(
    expect.objectContaining({
      activationEvent: 'onCommand:sample',
      memoryUsage: 4096,
      status: RuntimeStatusType.Activated,
    }),
  )
  expect(getMemoryUsage).toHaveBeenCalledWith('sample.extension')
})

test('does not measure memory for an extension that is not activated', async () => {
  ExtensionsState.updateRuntimeStatus('sample.extension', {
    status: RuntimeStatusType.Activating,
  })
  const getMemoryUsage = jest.fn<(extensionId: string) => Promise<number>>(async () => 4096)

  await expect(getRuntimeStatus('sample.extension', getMemoryUsage)).resolves.toEqual(expect.objectContaining({ memoryUsage: 0 }))
  expect(getMemoryUsage).not.toHaveBeenCalled()
})

test.each([Number.NaN, -1, 0])('normalizes invalid memory usage %s to zero', async (memoryUsage) => {
  ExtensionsState.updateRuntimeStatus('sample.extension', {
    status: RuntimeStatusType.Activated,
  })

  await expect(getRuntimeStatus('sample.extension', async () => memoryUsage)).resolves.toEqual(expect.objectContaining({ memoryUsage: 0 }))
})

test('returns runtime status when memory measurement fails', async () => {
  ExtensionsState.updateRuntimeStatus('sample.extension', {
    status: RuntimeStatusType.Activated,
  })

  await expect(
    getRuntimeStatus('sample.extension', async () => {
      throw new Error('memory unavailable')
    }),
  ).resolves.toEqual(expect.objectContaining({ memoryUsage: 0, status: RuntimeStatusType.Activated }))
})
