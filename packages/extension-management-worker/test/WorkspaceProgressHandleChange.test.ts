import type { Rpc } from '@lvce-editor/rpc'
import { afterEach, expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'
import * as WorkspaceProgressHandleChange from '../src/parts/WorkspaceProgressHandleChange/WorkspaceProgressHandleChange.ts'

const invocations: unknown[][] = []
const extensionRpc: Rpc = {
  dispose: async () => {},
  invoke: async (method: string, ...params: readonly unknown[]): Promise<unknown> => {
    invocations.push([method, ...params])
    return [{ message: 'Installing the remote server…', status: 'in-progress' }]
  },
  invokeAndTransfer: async (): Promise<void> => {},
  send: (): void => {},
}

afterEach(() => {
  IsolatedExtensionHostWorkerState.clear()
  invocations.length = 0
})

test('queries extension progress and forwards it with its workspace operation id', async () => {
  const calls: unknown[][] = []
  IsolatedExtensionHostWorkerState.set('sample.remote', extensionRpc)
  using renderer = RendererWorker.registerMockRpc({
    'Workspace.handleExtensionProgressChange'(...args: readonly unknown[]): void {
      calls.push([...args])
    },
  })
  expect(renderer).toBeDefined()

  await WorkspaceProgressHandleChange.handleChange(42)

  expect(invocations).toEqual([['ExtensionApi.getWorkspaceProgressData']])
  expect(calls).toEqual([[42, { message: 'Installing the remote server…', status: 'in-progress' }]])
})

test('ignores invalid operation ids', async () => {
  await WorkspaceProgressHandleChange.handleChange()
  expect(invocations).toEqual([])
})
