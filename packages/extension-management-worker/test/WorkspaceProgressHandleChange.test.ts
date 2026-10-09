import { RendererWorker } from '@lvce-editor/rpc-registry'
import { expect, jest, test } from '@jest/globals'

const invokeExtension = jest.fn<(method: string) => Promise<unknown>>(async () => [
  { message: 'Installing the remote server…', status: 'in-progress' },
])
jest.unstable_mockModule('../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts', () => ({
  get: jest.fn(() => ({ invoke: invokeExtension })),
  getIds: jest.fn(() => ['sample.remote']),
}))

const WorkspaceProgressHandleChange = await import('../src/parts/WorkspaceProgressHandleChange/WorkspaceProgressHandleChange.ts')

test('queries extension progress and forwards it with its workspace operation id', async () => {
  invokeExtension.mockClear()
  const calls: unknown[][] = []
  using renderer = RendererWorker.registerMockRpc({
    'Workspace.handleExtensionProgressChange'(...args: readonly unknown[]): void {
      calls.push([...args])
    },
  })
  expect(renderer).toBeDefined()

  await WorkspaceProgressHandleChange.handleChange(42)

  expect(invokeExtension).toHaveBeenCalledWith('ExtensionApi.getWorkspaceProgressData')
  expect(calls).toEqual([[42, { message: 'Installing the remote server…', status: 'in-progress' }]])
})

test('ignores invalid operation ids', async () => {
  invokeExtension.mockClear()
  await WorkspaceProgressHandleChange.handleChange(undefined)
  expect(invokeExtension).not.toHaveBeenCalled()
})
