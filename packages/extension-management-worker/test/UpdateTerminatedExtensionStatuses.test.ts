import type { Rpc } from '@lvce-editor/rpc'
import { afterEach, expect, jest, test } from '@jest/globals'
import type { RuntimeStatus } from '../src/parts/RuntimeStatus/RuntimeStatus.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as RuntimeStatusType from '../src/parts/RuntimeStatusType/RuntimeStatusType.ts'
import { updateTerminatedExtensionStatuses } from '../src/parts/UpdateTerminatedExtensionStatuses/UpdateTerminatedExtensionStatuses.ts'

const createStatus = (id: string): RuntimeStatus => ({
  activationEndTime: 2,
  activationEvent: 'onCommand:sample.run',
  activationStartTime: 1,
  activationTime: 1,
  id,
  importEndTime: 0,
  importStartTime: 0,
  importTime: 0,
  status: RuntimeStatusType.Activated,
})

afterEach(() => {
  ExtensionsState.reset()
})

test('keeps responsive isolated extensions running', async () => {
  const status = createStatus('sample.extension')
  ExtensionsState.setRuntimeStatus(status)
  const rpc = {
    invoke: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  } as unknown as Rpc

  await updateTerminatedExtensionStatuses(
    { [status.id]: status },
    () => rpc,
    0,
    async () => {},
  )

  expect(ExtensionsState.getRuntimeStatus(status.id)?.status).toBe(RuntimeStatusType.Activated)
})

test('treats rpc errors as proof that the worker is responsive', async () => {
  const status = createStatus('sample.extension')
  ExtensionsState.setRuntimeStatus(status)
  const rpc = {
    invoke: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Method not found')),
  } as unknown as Rpc

  await updateTerminatedExtensionStatuses(
    { [status.id]: status },
    () => rpc,
    0,
    async () => {},
  )

  expect(ExtensionsState.getRuntimeStatus(status.id)?.status).toBe(RuntimeStatusType.Activated)
})

test('marks an unresponsive isolated extension as terminated', async () => {
  const status = createStatus('sample.extension')
  ExtensionsState.setRuntimeStatus(status)
  const rpc = {
    invoke: jest.fn<() => Promise<void>>().mockReturnValue(new Promise(() => {})),
  } as unknown as Rpc

  await updateTerminatedExtensionStatuses(
    { [status.id]: status },
    () => rpc,
    0,
    async () => {},
  )

  expect(ExtensionsState.getRuntimeStatus(status.id)).toEqual({
    ...status,
    error: 'Extension worker stopped responding',
    status: RuntimeStatusType.Terminated,
  })
})
