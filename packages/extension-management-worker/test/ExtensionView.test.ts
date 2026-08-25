import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import {
  createViewInstance,
  dispatchViewEvent,
  disposeViewInstance,
  getViewActions,
  getViewActionsDom,
  getViewMenuEntries,
  renderViewInstance,
  requestViewRerender,
  saveViewInstanceState,
  setViewInstanceActive,
  showViewContextMenu,
} from '../src/parts/ExtensionView/ExtensionView.ts'
import * as ExtensionViewInstanceState from '../src/parts/ExtensionViewInstanceState/ExtensionViewInstanceState.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch')
const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')

const state: {
  rendererWorker: DisposableMockRpc | undefined
  sharedProcess: DisposableMockRpc | undefined
} = {
  rendererWorker: undefined,
  sharedProcess: undefined,
}

const createRpc = (
  options: {
    readonly errors?: Readonly<Record<string, Error>>
    readonly eventListeners?: readonly unknown[]
    readonly focusSelector?: string
  } = {},
): {
  readonly disposals: readonly unknown[]
  readonly invocations: readonly unknown[]
  readonly rpc: Rpc
} => {
  const disposals: unknown[] = []
  const invocations: unknown[] = []
  const rpc: Rpc = {
    dispose: async () => {
      disposals.push(undefined)
    },
    invoke: async (method: string, ...params: readonly unknown[]): Promise<unknown> => {
      invocations.push([method, ...params])
      const error = options.errors?.[method]
      if (error) {
        throw error
      }
      if (method === 'ExtensionApi.getViewRegistrySnapshot') {
        return {
          views: [
            {
              ...(options.eventListeners && { eventListeners: options.eventListeners }),
              id: 'sample.views.testing',
            },
          ],
        }
      }
      if (method === 'ExtensionApi.createViewInstance') {
        return {
          dom: [],
          ...(options.focusSelector && { focusSelector: options.focusSelector }),
          type: 'setDom',
        }
      }
      if (method === 'ExtensionApi.dispatchViewEvent') {
        return {
          ...(options.focusSelector && { focusSelector: options.focusSelector }),
          patches: [],
          type: 'setPatches',
        }
      }
      if (method === 'ExtensionApi.renderViewInstance') {
        return {
          ...(options.focusSelector && { focusSelector: options.focusSelector }),
          patches: [],
          type: 'setPatches',
        }
      }
      if (method === 'ExtensionApi.getViewMenuEntries') {
        return [
          {
            command: 'sample.open',
            flags: 0,
            id: 'open',
            label: 'Open',
          },
        ]
      }
      if (method === 'ExtensionApi.getViewActions') {
        return [
          {
            command: 'sample.refresh',
            icon: 'Refresh',
            title: 'Refresh',
          },
        ]
      }
      if (method === 'ExtensionApi.getViewActionsDom') {
        return [
          {
            childCount: 0,
            className: 'CustomAction',
            type: 1,
          },
        ]
      }
      return undefined
    },
    invokeAndTransfer: async (): Promise<void> => {},
    send: (): void => {},
  }
  return {
    disposals,
    invocations,
    rpc,
  }
}

afterEach(() => {
  ExtensionViewInstanceState.clear()
  ExtensionsState.reset()
  IsolatedExtensionHostWorkerState.clear()
  state.rendererWorker?.[Symbol.dispose]()
  state.sharedProcess?.[Symbol.dispose]()
  state.rendererWorker = undefined
  state.sharedProcess = undefined
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

test('proxies virtual dom view lifecycle to isolated extension rpc', async () => {
  const mock = createRpc()
  const extensions = [
    {
      activation: ['onView:sample.views.testing', 'onCommand:sample.refresh'],
      id: 'extension-one',
      isolated: true,
      views: [
        {
          id: 'sample.views.testing',
        },
      ],
    },
  ]
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return extensions
    },
  })
  IsolatedExtensionHostWorkerState.set('extension-one', mock.rpc)

  await expect(createViewInstance('sample.views.testing', 1, {}, '/assets', 2)).resolves.toEqual({
    ok: true,
    result: {
      dom: [],
      type: 'setDom',
    },
  })
  await expect(dispatchViewEvent('sample.views.testing', 1, { type: 'click' }, '/assets', 2)).resolves.toEqual({
    patches: [],
    type: 'setPatches',
  })
  await disposeViewInstance('sample.views.testing', 1, '/assets', 2)

  expect(mock.invocations).toEqual([
    ['ExtensionApi.getViewRegistrySnapshot'],
    ['ExtensionApi.createViewInstance', 'sample.views.testing', 1, {}],
    ['ExtensionApi.dispatchViewEvent', 1, { type: 'click' }],
    ['ExtensionApi.disposeViewInstance', 1],
  ])
  expect(mock.disposals).toHaveLength(1)
  expect(IsolatedExtensionHostWorkerState.get('extension-one')).toBeUndefined()
})

test.each(['onDiagnostic:javascript', 'onSourceControl', 'onStatusBarItem'])(
  'keeps an extension worker with the background activation %s',
  async (backgroundActivation) => {
    const mock = createRpc()
    state.sharedProcess = SharedProcess.registerMockRpc({
      'ExtensionManagement.getAllExtensions'() {
        return [
          {
            activation: ['onView:sample.views.testing', 'onCommand:sample.refresh', backgroundActivation],
            id: 'extension-one',
            isolated: true,
            views: [{ id: 'sample.views.testing' }],
          },
        ]
      },
    })
    IsolatedExtensionHostWorkerState.set('extension-one', mock.rpc)
    await createViewInstance('sample.views.testing', 1, {}, '/assets', 2)

    await disposeViewInstance('sample.views.testing', 1, '/assets', 2)

    expect(mock.disposals).toHaveLength(0)
    expect(IsolatedExtensionHostWorkerState.get('extension-one')).toBe(mock.rpc)
  },
)

test('keeps an extension worker while another contributed view instance is open', async () => {
  const mock = createRpc()
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [
        {
          activation: ['onView:sample.views.testing', 'onView:sample.views.other'],
          id: 'extension-one',
          isolated: true,
          views: [{ id: 'sample.views.testing' }, { id: 'sample.views.other' }],
        },
      ]
    },
  })
  IsolatedExtensionHostWorkerState.set('extension-one', mock.rpc)
  await createViewInstance('sample.views.testing', 1, {}, '/assets', 2)
  await createViewInstance('sample.views.other', 2, {}, '/assets', 2)

  await disposeViewInstance('sample.views.testing', 1, '/assets', 2)

  expect(mock.disposals).toHaveLength(0)
  expect(IsolatedExtensionHostWorkerState.get('extension-one')).toBe(mock.rpc)

  await disposeViewInstance('sample.views.other', 2, '/assets', 2)

  expect(mock.disposals).toHaveLength(1)
  expect(IsolatedExtensionHostWorkerState.get('extension-one')).toBeUndefined()
})

test('disposeViewInstance does not activate a worker for a missing instance', async () => {
  await disposeViewInstance('sample.views.testing', 1, '/assets', 2)

  expect(IsolatedExtensionHostWorkerState.getIds()).toEqual([])
})

test('createViewInstance resolves empty web context before loading a virtual dom view', async () => {
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
            activation: ['onView:sample.views.testing'],
            id: 'extension-one',
            isolated: true,
            isWeb: true,
            path: '/static/extensions/extension-one',
            views: [
              {
                id: 'sample.views.testing',
              },
            ],
          },
        ],
        ok: true,
      } as Response
    },
  })
  const mock = createRpc()
  IsolatedExtensionHostWorkerState.set('extension-one', mock.rpc)

  await expect(createViewInstance('sample.views.testing', 1, {}, '', PlatformType.Web)).resolves.toEqual({
    ok: true,
    result: {
      dom: [],
      type: 'setDom',
    },
  })

  expect(mock.invocations).toEqual([['ExtensionApi.getViewRegistrySnapshot'], ['ExtensionApi.createViewInstance', 'sample.views.testing', 1, {}]])
})

test('proxies focus selector in virtual dom view lifecycle results', async () => {
  const mock = createRpc({
    focusSelector: '[name="newCardTitle:list-1"]',
  })
  const extensions = [
    {
      activation: ['onView:sample.views.testing'],
      id: 'extension-one',
      isolated: true,
      views: [
        {
          id: 'sample.views.testing',
        },
      ],
    },
  ]
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return extensions
    },
  })
  IsolatedExtensionHostWorkerState.set('extension-one', mock.rpc)

  await expect(createViewInstance('sample.views.testing', 1, {}, '/assets', 2)).resolves.toEqual({
    ok: true,
    result: {
      dom: [],
      focusSelector: '[name="newCardTitle:list-1"]',
      type: 'setDom',
    },
  })
  await expect(dispatchViewEvent('sample.views.testing', 1, { type: 'click' }, '/assets', 2)).resolves.toEqual({
    focusSelector: '[name="newCardTitle:list-1"]',
    patches: [],
    type: 'setPatches',
  })
  await expect(renderViewInstance('sample.views.testing', 1, '/assets', 2)).resolves.toEqual({
    focusSelector: '[name="newCardTitle:list-1"]',
    patches: [],
    type: 'setPatches',
  })
})

test('returns event listeners registered through the isolated extension api', async () => {
  const eventListeners = [
    {
      name: 'handleVideoError',
      params: ['handleError', 'event.target.error.code', 'event.target.error.message'],
    },
  ]
  const mock = createRpc({
    eventListeners,
  })
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [
        {
          activation: ['onView:sample.views.testing'],
          id: 'extension-one',
          isolated: true,
          views: [
            {
              id: 'sample.views.testing',
            },
          ],
        },
      ]
    },
  })
  IsolatedExtensionHostWorkerState.set('extension-one', mock.rpc)

  await expect(createViewInstance('sample.views.testing', 1, {}, '/assets', 2)).resolves.toEqual({
    eventListeners,
    ok: true,
    result: {
      dom: [],
      type: 'setDom',
    },
  })
})

test('createViewInstance returns error result when rpc creation fails', async () => {
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      throw new Error('Failed to get extensions')
    },
  })

  await expect(createViewInstance('sample.views.testing', 1, {}, '/assets', 2)).resolves.toEqual({
    error: expect.objectContaining({
      message: 'Failed to get extensions',
      name: 'Error',
    }),
    ok: false,
  })
  expect(ExtensionViewInstanceState.get(1)).toEqual({
    error: expect.objectContaining({
      message: 'Failed to get extensions',
      name: 'Error',
    }),
    status: 'error',
    viewId: 'sample.views.testing',
  })
})

test('createViewInstance returns error result when extension create fails', async () => {
  const mock = createRpc({
    errors: { 'ExtensionApi.createViewInstance': new Error('create failed') },
  })
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [
        {
          activation: ['onView:sample.views.testing'],
          id: 'extension-one',
          isolated: true,
          views: [
            {
              id: 'sample.views.testing',
            },
          ],
        },
      ]
    },
  })
  IsolatedExtensionHostWorkerState.set('extension-one', mock.rpc)

  await expect(createViewInstance('sample.views.testing', 1, {}, '/assets', 2)).resolves.toEqual({
    error: expect.objectContaining({
      message: 'create failed',
      name: 'Error',
    }),
    ok: false,
  })
  expect(ExtensionViewInstanceState.get(1)).toEqual({
    error: expect.objectContaining({
      message: 'create failed',
      name: 'Error',
    }),
    status: 'error',
    viewId: 'sample.views.testing',
  })
})

test('disposeViewInstance removes error state without invoking extension rpc', async () => {
  const mock = createRpc({
    errors: { 'ExtensionApi.createViewInstance': new Error('create failed') },
  })
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [
        {
          activation: ['onView:sample.views.testing'],
          id: 'extension-one',
          isolated: true,
          views: [
            {
              id: 'sample.views.testing',
            },
          ],
        },
      ]
    },
  })
  IsolatedExtensionHostWorkerState.set('extension-one', mock.rpc)

  await createViewInstance('sample.views.testing', 1, {}, '/assets', 2)
  await disposeViewInstance('sample.views.testing', 1, '/assets', 2)

  expect(ExtensionViewInstanceState.get(1)).toBeUndefined()
  expect(mock.invocations).toEqual([['ExtensionApi.getViewRegistrySnapshot'], ['ExtensionApi.createViewInstance', 'sample.views.testing', 1, {}]])
})

test('view lifecycle calls no-op after failed createViewInstance', async () => {
  const mock = createRpc({
    errors: { 'ExtensionApi.createViewInstance': new Error('create failed') },
  })
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [
        {
          activation: ['onView:sample.views.testing'],
          id: 'extension-one',
          isolated: true,
          views: [
            {
              id: 'sample.views.testing',
            },
          ],
        },
      ]
    },
  })
  IsolatedExtensionHostWorkerState.set('extension-one', mock.rpc)

  await createViewInstance('sample.views.testing', 1, {}, '/assets', 2)

  await expect(dispatchViewEvent('sample.views.testing', 1, { type: 'click' }, '/assets', 2)).resolves.toBeUndefined()
  await expect(saveViewInstanceState('sample.views.testing', 1, '/assets', 2)).resolves.toBeUndefined()
  expect(mock.invocations).toEqual([['ExtensionApi.getViewRegistrySnapshot'], ['ExtensionApi.createViewInstance', 'sample.views.testing', 1, {}]])
})

test('requestViewRerender asks renderer worker to rerender viewlet instance', async () => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'Viewlet.executeViewletCommand'() {},
  })

  await requestViewRerender(1)

  expect(state.rendererWorker.invocations).toEqual([['Viewlet.executeViewletCommand', 1, 'rerender']])
})

test('showViewContextMenu asks renderer worker to show extension view menu', async () => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'ExtensionManagement.showViewContextMenu'() {},
  })

  await showViewContextMenu(1, 'sample.views.testing', 'sample.card', 10, 20)

  expect(state.rendererWorker.invocations).toEqual([['ExtensionManagement.showViewContextMenu', 1, 'sample.views.testing', 'sample.card', 10, 20]])
})

test('renderViewInstance proxies to isolated extension rpc', async () => {
  const mock = createRpc()
  ExtensionViewInstanceState.set(1, {
    rpc: mock.rpc,
    status: 'ready',
    viewId: 'sample.views.testing',
  })

  await expect(renderViewInstance('sample.views.testing', 1, '', 2)).resolves.toEqual({
    patches: [],
    type: 'setPatches',
  })

  expect(mock.invocations).toEqual([['ExtensionApi.renderViewInstance', 1]])
})

test('setViewInstanceActive proxies to isolated extension rpc', async () => {
  const mock = createRpc()
  ExtensionViewInstanceState.set(1, {
    rpc: mock.rpc,
    status: 'ready',
    viewId: 'sample.views.testing',
  })

  await setViewInstanceActive('sample.views.testing', 1, true, '', 2)

  expect(mock.invocations).toEqual([['ExtensionApi.setViewInstanceActive', 1, true]])
})

test('setViewInstanceActive ignores extension api versions without the optional command', async () => {
  const error = new Error('Command not found ExtensionApi.setViewInstanceActive')
  Object.defineProperty(error, 'name', {
    value: 'CommandNotFoundError',
  })
  const mock = createRpc({
    errors: { 'ExtensionApi.setViewInstanceActive': error },
  })
  ExtensionViewInstanceState.set(1, {
    rpc: mock.rpc,
    status: 'ready',
    viewId: 'sample.views.testing',
  })

  await expect(setViewInstanceActive('sample.views.testing', 1, false, '', 2)).resolves.toBeUndefined()
  expect(mock.invocations).toEqual([['ExtensionApi.setViewInstanceActive', 1, false]])
})

test('setViewInstanceActive rethrows extension errors', async () => {
  const error = new Error('Failed to update active view')
  const mock = createRpc({
    errors: { 'ExtensionApi.setViewInstanceActive': error },
  })
  ExtensionViewInstanceState.set(1, {
    rpc: mock.rpc,
    status: 'ready',
    viewId: 'sample.views.testing',
  })

  await expect(setViewInstanceActive('sample.views.testing', 1, true, '', 2)).rejects.toBe(error)
})

test('setViewInstanceActive no-ops for disposed or failed instances', async () => {
  await expect(setViewInstanceActive('sample.views.testing', 1, true, '', 2)).resolves.toBeUndefined()
  ExtensionViewInstanceState.set(1, {
    error: {
      message: 'create failed',
      name: 'Error',
    },
    status: 'error',
    viewId: 'sample.views.testing',
  })

  await expect(setViewInstanceActive('sample.views.testing', 1, true, '', 2)).resolves.toBeUndefined()
})

test('getViewMenuEntries proxies to isolated extension rpc', async () => {
  const mock = createRpc()
  ExtensionViewInstanceState.set(1, {
    rpc: mock.rpc,
    status: 'ready',
    viewId: 'sample.views.testing',
  })

  await expect(getViewMenuEntries('sample.views.testing', 1, 'sample.card', '', 2)).resolves.toEqual([
    {
      command: 'sample.open',
      flags: 0,
      id: 'open',
      label: 'Open',
    },
  ])

  expect(mock.invocations).toEqual([['ExtensionApi.getViewMenuEntries', 1, 'sample.card']])
})

test('getViewActions proxies to isolated extension rpc', async () => {
  const mock = createRpc()
  ExtensionViewInstanceState.set(1, {
    rpc: mock.rpc,
    status: 'ready',
    viewId: 'sample.views.testing',
  })

  await expect(getViewActions('sample.views.testing', 1, '', 2)).resolves.toEqual([
    {
      command: 'sample.refresh',
      icon: 'Refresh',
      title: 'Refresh',
    },
  ])

  expect(mock.invocations).toEqual([['ExtensionApi.getViewActions', 1]])
})

test('getViewActionsDom proxies to isolated extension rpc', async () => {
  const mock = createRpc()
  ExtensionViewInstanceState.set(1, {
    rpc: mock.rpc,
    status: 'ready',
    viewId: 'sample.views.testing',
  })

  await expect(getViewActionsDom('sample.views.testing', 1, '', 2)).resolves.toEqual([
    {
      childCount: 0,
      className: 'CustomAction',
      type: 1,
    },
  ])

  expect(mock.invocations).toEqual([['ExtensionApi.getViewActionsDom', 1]])
})

test('getViewActionsDom returns undefined when the optional extension api command is unavailable', async () => {
  const error = new Error('Command not found ExtensionApi.getViewActionsDom')
  Object.defineProperty(error, 'name', {
    value: 'CommandNotFoundError',
  })
  const mock = createRpc({
    errors: { 'ExtensionApi.getViewActionsDom': error },
  })
  ExtensionViewInstanceState.set(1, {
    rpc: mock.rpc,
    status: 'ready',
    viewId: 'sample.views.testing',
  })

  await expect(getViewActionsDom('sample.views.testing', 1, '', 2)).resolves.toBeUndefined()
  expect(mock.invocations).toEqual([['ExtensionApi.getViewActionsDom', 1]])
})

test('getViewActionsDom rethrows extension errors', async () => {
  const error = new Error('Failed to render view actions')
  const mock = createRpc({
    errors: { 'ExtensionApi.getViewActionsDom': error },
  })
  ExtensionViewInstanceState.set(1, {
    rpc: mock.rpc,
    status: 'ready',
    viewId: 'sample.views.testing',
  })

  await expect(getViewActionsDom('sample.views.testing', 1, '', 2)).rejects.toBe(error)
})

test('getViewMenuEntries returns empty array for disposed or failed instances', async () => {
  await expect(getViewMenuEntries('sample.views.testing', 1, 'sample.card', '', 2)).resolves.toEqual([])
  ExtensionViewInstanceState.set(1, {
    error: {
      message: 'create failed',
      name: 'Error',
    },
    status: 'error',
    viewId: 'sample.views.testing',
  })

  await expect(getViewMenuEntries('sample.views.testing', 1, 'sample.card', '', 2)).resolves.toEqual([])
})

test('getViewActions returns empty array for disposed or failed instances', async () => {
  await expect(getViewActions('sample.views.testing', 1, '', 2)).resolves.toEqual([])
  ExtensionViewInstanceState.set(1, {
    error: {
      message: 'create failed',
      name: 'Error',
    },
    status: 'error',
    viewId: 'sample.views.testing',
  })

  await expect(getViewActions('sample.views.testing', 1, '', 2)).resolves.toEqual([])
})

test('getViewActionsDom returns undefined for disposed or failed instances', async () => {
  await expect(getViewActionsDom('sample.views.testing', 1, '', 2)).resolves.toBeUndefined()
  ExtensionViewInstanceState.set(1, {
    error: {
      message: 'create failed',
      name: 'Error',
    },
    status: 'error',
    viewId: 'sample.views.testing',
  })

  await expect(getViewActionsDom('sample.views.testing', 1, '', 2)).resolves.toBeUndefined()
})

test('renderViewInstance no-ops for disposed or failed instances', async () => {
  await expect(renderViewInstance('sample.views.testing', 1, '', 2)).resolves.toBeUndefined()
  ExtensionViewInstanceState.set(1, {
    error: {
      message: 'create failed',
      name: 'Error',
    },
    status: 'error',
    viewId: 'sample.views.testing',
  })

  await expect(renderViewInstance('sample.views.testing', 1, '', 2)).resolves.toBeUndefined()
})
