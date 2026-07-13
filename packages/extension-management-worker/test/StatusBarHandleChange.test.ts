import { expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { handleChange } from '../src/parts/StatusBarHandleChange/StatusBarHandleChange.ts'

test('handleChange refreshes the status bar through the renderer', async () => {
  using mockRpc = RendererWorker.registerMockRpc({
    'StatusBar.handleItemsChanged': async () => {},
  })

  await handleChange('git.checkout')

  expect(mockRpc.invocations).toEqual([['StatusBar.handleItemsChanged']])
})
