import { expect, jest, test } from '@jest/globals'

const invoke = jest.fn<(method: string) => Promise<unknown>>(async () => [{ message: 'Starting remote server…', status: 'in-progress' }])
jest.unstable_mockModule('../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts', () => ({
  get: jest.fn(() => ({ invoke })),
  getIds: jest.fn(() => ['sample.remote']),
}))

const GetWorkspaceProgressData = await import('../src/parts/GetWorkspaceProgressData/GetWorkspaceProgressData.ts')

test('returns active workspace progress data from an isolated extension', async () => {
  await expect(GetWorkspaceProgressData.getWorkspaceProgressData()).resolves.toEqual({ message: 'Starting remote server…', status: 'in-progress' })
  expect(invoke).toHaveBeenCalledWith('ExtensionApi.getWorkspaceProgressData')
})

test('skips invalid and failed providers without failing the workspace query', async () => {
  invoke.mockResolvedValueOnce([{ message: 1, status: 'error' }])
  await expect(GetWorkspaceProgressData.getWorkspaceProgressData()).resolves.toEqual({ message: '', status: 'idle' })
  invoke.mockRejectedValueOnce(new Error('provider unavailable'))
  await expect(GetWorkspaceProgressData.getWorkspaceProgressData()).resolves.toEqual({ message: '', status: 'idle' })
})
