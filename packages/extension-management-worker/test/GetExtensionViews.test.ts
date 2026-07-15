import type { Rpc } from '@lvce-editor/rpc'
import { afterEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { getExtensionViews } from '../src/parts/GetExtensionViews/GetExtensionViews.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

afterEach(() => {
  IsolatedExtensionHostWorkerState.clear()
})

test('getExtensionViews converts registered views', async () => {
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (): Promise<unknown> => ({
      views: [{ id: 'sample.views.files', title: 'Registered title' }],
    }),
    invokeAndTransfer: async (): Promise<void> => {},
    send: (): void => {},
  }
  IsolatedExtensionHostWorkerState.set('sample.extension', rpc)

  await expect(
    getExtensionViews(
      {
        id: 'sample.extension',
        views: [{ id: 'sample.views.files', title: 'Manifest title' }],
      },
      '',
      PlatformType.Remote,
    ),
  ).resolves.toEqual([
    {
      extensionId: 'sample.extension',
      icon: '',
      id: 'sample.views.files',
      iframe: undefined,
      kind: '',
      showSideBarHeader: true,
      title: 'Registered title',
    },
  ])
})

test('getExtensionViews ignores snapshots without a views array', async () => {
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (): Promise<unknown> => ({}),
    invokeAndTransfer: async (): Promise<void> => {},
    send: (): void => {},
  }
  IsolatedExtensionHostWorkerState.set('sample.extension', rpc)

  await expect(getExtensionViews({ id: 'sample.extension' }, '', PlatformType.Remote)).resolves.toEqual([])
})
