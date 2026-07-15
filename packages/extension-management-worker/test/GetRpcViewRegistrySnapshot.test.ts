import type { Rpc } from '@lvce-editor/rpc'
import { expect, test } from '@jest/globals'
import { getRpcViewRegistrySnapshot } from '../src/parts/GetRpcViewRegistrySnapshot/GetRpcViewRegistrySnapshot.ts'

test('getRpcViewRegistrySnapshot requests the view registry snapshot', async () => {
  const invocations: string[] = []
  const snapshot = {
    views: [{ id: 'sample.views.files' }],
  }
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string): Promise<unknown> => {
      invocations.push(method)
      return snapshot
    },
    invokeAndTransfer: async (): Promise<void> => {},
    send: (): void => {},
  }

  await expect(getRpcViewRegistrySnapshot(rpc)).resolves.toBe(snapshot)
  expect(invocations).toEqual(['ExtensionApi.getViewRegistrySnapshot'])
})
