import type { Rpc } from '@lvce-editor/rpc'
import { afterEach, expect, test } from '@jest/globals'
import { getViewsFromExtensionWorkers } from '../src/parts/GetViews/GetViews.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const createRpc = (
  result: unknown,
): {
  readonly invocations: readonly unknown[]
  readonly rpc: Rpc
} => {
  const invocations: unknown[] = []
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string): Promise<unknown> => {
      invocations.push([method])
      return result
    },
    invokeAndTransfer: async (): Promise<void> => {},
    send: (): void => {},
  }
  return {
    invocations,
    rpc,
  }
}

afterEach(() => {
  IsolatedExtensionHostWorkerState.clear()
})

test('getViewsFromExtensionWorkers asks matching isolated extension workers for registered views', async () => {
  const firstRpc = createRpc({
    views: [
      {
        icon: 'symbol-beaker',
        id: 'sample.views.testing',
        title: 'Testing',
      },
    ],
  })
  const secondRpc = createRpc({
    views: [
      {
        id: 'sample.views.output',
      },
    ],
  })
  IsolatedExtensionHostWorkerState.set('extension-one', firstRpc.rpc)
  IsolatedExtensionHostWorkerState.set('extension-two', secondRpc.rpc)

  await expect(
    getViewsFromExtensionWorkers(
      [
        {
          id: 'extension-one',
          isolated: true,
          path: '/extensions/extension-one',
          views: [
            {
              icon: 'symbol-beaker',
              iframe: {
                path: 'view.html',
                sandbox: ['allow-scripts'],
              },
              id: 'sample.views.testing',
              title: 'Testing',
            },
          ],
        },
        {
          id: 'extension-two',
          isolated: true,
          views: [
            {
              icon: 'symbol-output',
              id: 'sample.views.output',
              title: 'Output',
            },
          ],
        },
        {
          id: 'extension-three',
          isolated: false,
          views: [
            {
              id: 'sample.views.ignored',
            },
          ],
        },
      ],
      '',
      1,
    ),
  ).resolves.toEqual([
    {
      extensionId: 'extension-one',
      icon: 'symbol-beaker',
      id: 'sample.views.testing',
      iframe: {
        csp: '',
        credentialless: true,
        sandbox: ['allow-scripts'],
        src: '/extensions/extension-one/view.html',
      },
      title: 'Testing',
    },
    {
      extensionId: 'extension-two',
      icon: 'symbol-output',
      id: 'sample.views.output',
      iframe: undefined,
      title: 'Output',
    },
  ])

  expect(firstRpc.invocations).toEqual([['ExtensionApi.getViewRegistrySnapshot']])
  expect(secondRpc.invocations).toEqual([['ExtensionApi.getViewRegistrySnapshot']])
})

test('getViewsFromExtensionWorkers ignores invalid registry snapshots', async () => {
  const rpc = createRpc({
    views: [
      {
        id: 1,
      },
    ],
  })
  IsolatedExtensionHostWorkerState.set('extension-one', rpc.rpc)

  await expect(
    getViewsFromExtensionWorkers(
      [
        {
          id: 'extension-one',
          isolated: true,
          views: [
            {
              id: 'sample.views.testing',
            },
          ],
        },
      ],
      '',
      1,
    ),
  ).resolves.toEqual([])
})
