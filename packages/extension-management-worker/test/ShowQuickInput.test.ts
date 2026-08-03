import { expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { showQuickInput } from '../src/parts/ShowQuickInput/ShowQuickInput.ts'

test('showQuickInput forwards options and preserves acceptance', async () => {
  using mockRpc = RendererWorker.registerMockRpc({
    'ExtensionHostQuickPick.showQuickInput': async () => 'user@example.com',
  })
  const options = {
    placeholder: 'Enter SSH host',
    value: 'user@',
  }

  await expect(showQuickInput(options)).resolves.toBe('user@example.com')
  expect(mockRpc.invocations).toEqual([['ExtensionHostQuickPick.showQuickInput', options]])
})

test('showQuickInput preserves cancellation', async () => {
  using mockRpc = RendererWorker.registerMockRpc({
    'ExtensionHostQuickPick.showQuickInput': async () => undefined,
  })

  await expect(showQuickInput()).resolves.toBeUndefined()
  expect(mockRpc.invocations).toEqual([['ExtensionHostQuickPick.showQuickInput', {}]])
})
