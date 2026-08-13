import type { Rpc } from '@lvce-editor/rpc'
import { expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { handleChange } from '../src/parts/StatusBarHandleChange/StatusBarHandleChange.ts'
import * as StatusBarWorker from '../src/parts/StatusBarWorker/StatusBarWorker.ts'

test('handleChange refreshes the status bar through its direct port', async () => {
  const invocations: unknown[][] = []
  StatusBarWorker.set({
    async invoke(method: string, ...params: readonly unknown[]): Promise<void> {
      invocations.push([method, ...params])
    },
  } as unknown as Rpc)
  using mockRendererRpc = RendererWorker.registerMockRpc({
    'Layout.getStatusBarVisible': async () => true,
  })

  await handleChange('git.checkout')

  expect(mockRendererRpc.invocations).toEqual([['Layout.getStatusBarVisible']])
  expect(invocations).toEqual([['StatusBar.handleChange']])
})

test('handleChange skips the refresh when the status bar is hidden', async () => {
  using mockRpc = RendererWorker.registerMockRpc({
    'Layout.getStatusBarVisible': async () => false,
  })

  await handleChange('git.checkout')

  expect(mockRpc.invocations).toEqual([['Layout.getStatusBarVisible']])
})
