import { expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { showQuickPick } from '../src/parts/ShowQuickPick/ShowQuickPick.ts'

test('showQuickPick forwards items and options to the renderer worker', async () => {
  const selectedItem = {
    label: 'feature',
  }
  using mockRpc = RendererWorker.registerMockRpc({
    'ExtensionHostQuickPick.showQuickPick': async () => selectedItem,
  })
  const items = [
    {
      label: 'main',
    },
    selectedItem,
  ]

  await expect(
    showQuickPick({
      items,
      placeholder: 'Select a branch',
    }),
  ).resolves.toBe(selectedItem)

  expect(mockRpc.invocations).toEqual([
    [
      'ExtensionHostQuickPick.showQuickPick',
      {
        items,
        placeholder: 'Select a branch',
      },
    ],
  ])
})
