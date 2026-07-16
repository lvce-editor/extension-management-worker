import { expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { handleChange } from '../src/parts/StatusBarHandleChange/StatusBarHandleChange.ts'

test('handleChange refreshes the status bar through the renderer', async () => {
  using mockRpc = RendererWorker.registerMockRpc({
    'Layout.getStatusBarVisible': async () => true,
    'StatusBar.handleItemsChanged': async () => {},
  })

  await handleChange('git.checkout')

  expect(mockRpc.invocations).toEqual([['Layout.getStatusBarVisible'], ['StatusBar.handleItemsChanged']])
})

test('handleChange skips the refresh when the status bar is hidden', async () => {
  using mockRpc = RendererWorker.registerMockRpc({
    'Layout.getStatusBarVisible': async () => false,
  })

  await handleChange('git.checkout')

  expect(mockRpc.invocations).toEqual([['Layout.getStatusBarVisible']])
})
