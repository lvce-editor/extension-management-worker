import type { Rpc } from '@lvce-editor/rpc'
import { afterEach, expect, test } from '@jest/globals'
import * as GetWorkspaceProgressData from '../src/parts/GetWorkspaceProgressData/GetWorkspaceProgressData.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const invocations: unknown[][] = []
const state: { failure: Error | undefined; result: unknown } = {
  failure: undefined,
  result: [{ message: 'Starting remote server…', status: 'in-progress' }],
}

const rpc: Rpc = {
  dispose: async () => {},
  invoke: async (method: string, ...params: readonly unknown[]): Promise<unknown> => {
    invocations.push([method, ...params])
    if (state.failure) throw state.failure
    return state.result
  },
  invokeAndTransfer: async (): Promise<void> => {},
  send: (): void => {},
}

afterEach(() => {
  invocations.length = 0
  state.result = [{ message: 'Starting remote server…', status: 'in-progress' }]
  state.failure = undefined
  IsolatedExtensionHostWorkerState.clear()
})

test('returns active workspace progress data from an isolated extension', async () => {
  IsolatedExtensionHostWorkerState.set('sample.remote', rpc)
  await expect(GetWorkspaceProgressData.getWorkspaceProgressData()).resolves.toEqual({ message: 'Starting remote server…', status: 'in-progress' })
  expect(invocations).toEqual([['ExtensionApi.getWorkspaceProgressData']])
})

test('skips invalid and failed providers without failing the workspace query', async () => {
  IsolatedExtensionHostWorkerState.set('sample.remote', rpc)
  state.result = [{ message: 1, status: 'error' }]
  await expect(GetWorkspaceProgressData.getWorkspaceProgressData()).resolves.toEqual({ message: '', status: 'idle' })
  state.failure = new Error('provider unavailable')
  await expect(GetWorkspaceProgressData.getWorkspaceProgressData()).resolves.toEqual({ message: '', status: 'idle' })
})
