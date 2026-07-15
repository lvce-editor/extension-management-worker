import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, jest, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { getViews, getViewsFromExtensionWorkers } from '../src/parts/GetViews/GetViews.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch')
const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')

const state: {
  rendererWorker: DisposableMockRpc | undefined
} = {
  rendererWorker: undefined,
}

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
  jest.restoreAllMocks()
  IsolatedExtensionHostWorkerState.clear()
  state.rendererWorker?.[Symbol.dispose]()
  state.rendererWorker = undefined
  if (originalFetch) {
    Object.defineProperty(globalThis, 'fetch', originalFetch)
  } else {
    delete (globalThis as any).fetch
  }
  if (originalLocation) {
    Object.defineProperty(globalThis, 'location', originalLocation)
  } else {
    delete (globalThis as any).location
  }
})

test('getViews resolves empty web context before creating contributed views', async () => {
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: {
      origin: 'https://example.test',
      protocol: 'https:',
    },
  })
  state.rendererWorker = RendererWorker.registerMockRpc({
    'Layout.getAssetDir'() {
      return '/static'
    },
  })
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (url: string): Promise<Response> => {
      expect(url).toBe('/static/config/extensions.json')
      return {
        json: async () => [
          {
            id: 'extension-one',
            isolated: true,
            isWeb: true,
            path: '/static/extensions/extension-one',
            views: [
              {
                css: 'media/view.css',
                icon: 'symbol-beaker',
                id: 'sample.views.testing',
                iframe: {
                  path: 'view.html',
                },
                showSideBarHeader: false,
                title: 'Testing',
              },
            ],
          },
        ],
        ok: true,
      } as Response
    },
  })
  const rpc = createRpc({
    views: [
      {
        id: 'sample.views.testing',
      },
    ],
  })
  IsolatedExtensionHostWorkerState.set('extension-one', rpc.rpc)

  await expect(getViews('', PlatformType.Web)).resolves.toEqual([
    {
      css: '/static/extensions/extension-one/media/view.css',
      extensionId: 'extension-one',
      icon: 'symbol-beaker',
      id: 'sample.views.testing',
      iframe: {
        credentialless: true,
        csp: '',
        sandbox: ['allow-scripts'],
        src: '/static/extensions/extension-one/view.html',
      },
      kind: '',
      showSideBarHeader: false,
      title: 'Testing',
    },
  ])
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
      ],
      '',
      1,
    ),
  ).resolves.toEqual([
    {
      css: '/extensions/extension-one/media/view.css',
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
      showSideBarHeader: true,
      title: 'Testing',
    },
    {
      extensionId: 'extension-two',
      icon: 'symbol-output',
      id: 'sample.views.output',
      iframe: undefined,
      kind: '',
      showSideBarHeader: true,
      title: 'Output',
    },
  ])

  expect(firstRpc.invocations).toEqual([['ExtensionApi.getViewRegistrySnapshot']])
  expect(secondRpc.invocations).toEqual([['ExtensionApi.getViewRegistrySnapshot']])
})

test('getViewsFromExtensionWorkers warns when a non-isolated extension contributes views', async () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

  await expect(
    getViewsFromExtensionWorkers(
      [
        {
          id: 'extension-three',
          isolated: false,
          views: [
            {
              id: 'sample.views.ignored',
            },
          ],
        },
        {
          id: 'extension-without-views',
          isolated: false,
        },
      ],
      '',
      1,
    ),
  ).resolves.toEqual([])

  expect(warnSpy).toHaveBeenCalledTimes(1)
  expect(warnSpy).toHaveBeenCalledWith(
    'Extension "extension-three" contributes activity bar views but is not isolated. The views will not be shown. Add "isolated": true to extension.json to enable them.',
  )
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
      extensionId: 'extension-one',
      icon: '',
      id: 'sample.views.testing',
      iframe: undefined,
      kind: 'virtualDom',
      showSideBarHeader: true,
      title: 'sample.views.testing',
    },
  ])
})

test('getViewsFromExtensionWorkers includes preview routing metadata', async () => {
  const rpc = createRpc({
    views: [
      {
        id: 'builtin.media-preview',
        kind: 'virtualDom',
      },
    ],
  })
  IsolatedExtensionHostWorkerState.set('builtin.media-preview', rpc.rpc)

  await expect(
    getViewsFromExtensionWorkers(
      [
        {
          id: 'builtin.media-preview',
          isolated: true,
          views: [
            {
              id: 'builtin.media-preview',
              selector: ['.png', '.jpg', 1 as any],
              type: 'preview',
            },
          ],
        },
      ],
      '',
      1,
    ),
  ).resolves.toEqual([
    {
      extensionId: 'builtin.media-preview',
      icon: '',
      id: 'builtin.media-preview',
      iframe: undefined,
      kind: 'virtualDom',
      selector: ['.png', '.jpg'],
      showSideBarHeader: true,
      title: 'builtin.media-preview',
      type: 'preview',
    },
  ])
})

test('getViewsFromExtensionWorkers includes event listeners', async () => {
  const eventListeners = [
    {
      name: 'handleDragStart',
      params: ['handleViewEvent', 'dragstart', 'event.target.name'],
    },
  ]
  const rpc = createRpc({
    views: [
      {
        eventListeners,
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
      eventListeners,
      extensionId: 'extension-one',
      icon: '',
      id: 'sample.views.testing',
      iframe: undefined,
      kind: 'virtualDom',
      showSideBarHeader: true,
      title: 'sample.views.testing',
    },
  ])
})

test('getViewsFromExtensionWorkers prefers manifest image icon over registered icon', async () => {
  const rpc = createRpc({
    views: [
      {
        icon: 'list-tree',
        id: 'trello.views.boards',
        title: 'Trello',
      },
    ],
  })
  IsolatedExtensionHostWorkerState.set('builtin.trello', rpc.rpc)

  await expect(
    getViewsFromExtensionWorkers(
      [
        {
          id: 'builtin.trello',
          isolated: true,
          path: '/extensions/trello',
          views: [
            {
              icon: 'trello.svg',
              id: 'trello.views.boards',
              title: 'Trello',
            },
          ],
        },
      ],
      '',
      PlatformType.Remote,
    ),
  ).resolves.toEqual([
    {
      extensionId: 'builtin.trello',
      icon: 'http://localhost/remote/extensions/trello/trello.svg',
      id: 'trello.views.boards',
      iframe: undefined,
      kind: '',
      showSideBarHeader: true,
      title: 'Trello',
    },
  ])
})

test('getViewsFromExtensionWorkers preserves symbolic manifest icons', async () => {
  const rpc = createRpc({
    views: [
      {
        icon: 'list-tree',
        id: 'sample.views.output',
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
          path: '/extensions/extension-one',
          views: [
            {
              icon: 'symbol-output',
              id: 'sample.views.output',
            },
          ],
        },
      ],
      '',
      PlatformType.Remote,
    ),
  ).resolves.toEqual([
    {
      extensionId: 'extension-one',
      icon: 'symbol-output',
      id: 'sample.views.output',
      iframe: undefined,
      kind: '',
      showSideBarHeader: true,
      title: 'sample.views.output',
    },
  ])
})

test('getViewsFromExtensionWorkers falls back to registered icon when manifest icon is missing', async () => {
  const rpc = createRpc({
    views: [
      {
        icon: 'list-tree',
        id: 'sample.views.registeredIcon',
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
          path: '/extensions/extension-one',
          views: [
            {
              id: 'sample.views.registeredIcon',
            },
          ],
        },
      ],
      '',
      PlatformType.Remote,
    ),
  ).resolves.toEqual([
    {
      extensionId: 'extension-one',
      icon: 'list-tree',
      id: 'sample.views.registeredIcon',
      iframe: undefined,
      kind: '',
      showSideBarHeader: true,
      title: 'sample.views.registeredIcon',
    },
  ])
})

test('getViewsFromExtensionWorkers preserves absolute manifest icon urls', async () => {
  const icon = 'https://example.com/icon.svg'
  const rpc = createRpc({
    views: [
      {
        icon: 'list-tree',
        id: 'sample.views.absoluteIcon',
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
          path: '/extensions/extension-one',
          views: [
            {
              icon,
              id: 'sample.views.absoluteIcon',
            },
          ],
        },
      ],
      '',
      PlatformType.Remote,
    ),
  ).resolves.toEqual([
    {
      extensionId: 'extension-one',
      icon,
      id: 'sample.views.absoluteIcon',
      iframe: undefined,
      kind: '',
      showSideBarHeader: true,
      title: 'sample.views.absoluteIcon',
    },
  ])
})
