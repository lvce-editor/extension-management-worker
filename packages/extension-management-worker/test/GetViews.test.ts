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
              css: 'media/view.css',
              icon: 'symbol-beaker',
              id: 'sample.views.testing',
              iframe: {
                path: 'view.html',
                sandbox: ['allow-scripts'],
              },
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
      css: '/extensions/extension-one/media/view.css',
      displayName: 'Testing',
      extensionId: 'extension-one',
      icon: 'symbol-beaker',
      id: 'sample.views.testing',
      iframe: {
        credentialless: true,
        csp: '',
        sandbox: ['allow-scripts'],
        src: '/extensions/extension-one/view.html',
      },
      kind: '',
      title: 'Testing',
    },
    {
      displayName: 'Output',
      extensionId: 'extension-two',
      icon: 'symbol-output',
      id: 'sample.views.output',
      iframe: undefined,
      kind: '',
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

test('getViewsFromExtensionWorkers includes virtual dom kind', async () => {
  const rpc = createRpc({
    views: [
      {
        id: 'sample.views.testing',
        kind: 'virtualDom',
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
  ).resolves.toEqual([
    {
      displayName: 'sample.views.testing',
      extensionId: 'extension-one',
      icon: '',
      id: 'sample.views.testing',
      iframe: undefined,
      kind: 'virtualDom',
      title: 'sample.views.testing',
    },
  ])
})

test('getViewsFromExtensionWorkers prefers registered displayName', async () => {
  const rpc = createRpc({
    views: [
      {
        displayName: 'Registered Display',
        id: 'sample.views.testing',
        name: 'Registered Name',
        title: 'Registered Title',
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
              displayName: 'Manifest Display',
              id: 'sample.views.testing',
              name: 'Manifest Name',
              title: 'Manifest Title',
            },
          ],
        },
      ],
      '',
      1,
    ),
  ).resolves.toEqual([
    {
      displayName: 'Registered Display',
      extensionId: 'extension-one',
      icon: '',
      id: 'sample.views.testing',
      iframe: undefined,
      kind: '',
      title: 'Registered Display',
    },
  ])
})

test('getViewsFromExtensionWorkers falls back to manifest displayName and name', async () => {
  const displayNameRpc = createRpc({
    views: [
      {
        id: 'sample.views.display',
      },
    ],
  })
  const nameRpc = createRpc({
    views: [
      {
        id: 'sample.views.name',
      },
    ],
  })
  IsolatedExtensionHostWorkerState.set('extension-display', displayNameRpc.rpc)
  IsolatedExtensionHostWorkerState.set('extension-name', nameRpc.rpc)

  await expect(
    getViewsFromExtensionWorkers(
      [
        {
          id: 'extension-display',
          isolated: true,
          views: [
            {
              displayName: 'Manifest Display',
              id: 'sample.views.display',
              title: 'Manifest Title',
            },
          ],
        },
        {
          id: 'extension-name',
          isolated: true,
          views: [
            {
              id: 'sample.views.name',
              name: 'Manifest Name',
            },
          ],
        },
      ],
      '',
      1,
    ),
  ).resolves.toEqual([
    {
      displayName: 'Manifest Display',
      extensionId: 'extension-display',
      icon: '',
      id: 'sample.views.display',
      iframe: undefined,
      kind: '',
      title: 'Manifest Display',
    },
    {
      displayName: 'Manifest Name',
      extensionId: 'extension-name',
      icon: '',
      id: 'sample.views.name',
      iframe: undefined,
      kind: '',
      title: 'Manifest Name',
    },
  ])
})
