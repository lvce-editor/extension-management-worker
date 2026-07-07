import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import {
  createViewInstance,
  dispatchViewEvent,
  disposeViewInstance,
  renderViewInstance,
  requestViewRerender,
  saveViewInstanceState,
} from '../src/parts/ExtensionView/ExtensionView.ts'
import * as ExtensionViewInstanceState from '../src/parts/ExtensionViewInstanceState/ExtensionViewInstanceState.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const state: {
  rendererWorker: DisposableMockRpc | undefined
  sharedProcess: DisposableMockRpc | undefined
} = {
  rendererWorker: undefined,
  sharedProcess: undefined,
}

const createRpc = (
  options: { readonly createError?: Error; readonly focusSelector?: string } = {},
): {
  readonly invocations: readonly unknown[]
  readonly rpc: Rpc
} => {
  const invocations: unknown[] = []
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...params: readonly unknown[]): Promise<unknown> => {
      invocations.push([method, ...params])
      if (method === 'ExtensionApi.createViewInstance') {
        if (options.createError) {
          throw options.createError
        }
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
      return undefined
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
  ExtensionViewInstanceState.clear()
  ExtensionsState.reset()
  IsolatedExtensionHostWorkerState.clear()
  state.rendererWorker?.[Symbol.dispose]()
  state.sharedProcess?.[Symbol.dispose]()
  state.rendererWorker = undefined
  state.sharedProcess = undefined
})

test('proxies virtual dom view lifecycle to isolated extension rpc', async () => {
  const mock = createRpc()
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

  await expect(createViewInstance('sample.views.testing', 1, {}, '', 2)).resolves.toEqual({
    ok: true,
    result: {
      dom: [],
      type: 'setDom',
    },
  })
  await expect(dispatchViewEvent('sample.views.testing', 1, { type: 'click' }, '', 2)).resolves.toEqual({
    patches: [],
    type: 'setPatches',
  })
  await disposeViewInstance('sample.views.testing', 1, '', 2)

  expect(mock.invocations).toEqual([
    ['ExtensionApi.createViewInstance', 'sample.views.testing', 1, {}],
    ['ExtensionApi.dispatchViewEvent', 1, { type: 'click' }],
    ['ExtensionApi.disposeViewInstance', 1],
  ])
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

  await expect(createViewInstance('sample.views.testing', 1, {}, '', 2)).resolves.toEqual({
    ok: true,
    result: {
      dom: [],
      focusSelector: '[name="newCardTitle:list-1"]',
      type: 'setDom',
    },
  })
  await expect(dispatchViewEvent('sample.views.testing', 1, { type: 'click' }, '', 2)).resolves.toEqual({
    focusSelector: '[name="newCardTitle:list-1"]',
    patches: [],
    type: 'setPatches',
  })
  await expect(renderViewInstance('sample.views.testing', 1, '', 2)).resolves.toEqual({
    focusSelector: '[name="newCardTitle:list-1"]',
    patches: [],
    type: 'setPatches',
  })
})

test('createViewInstance returns error result when rpc creation fails', async () => {
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      throw new Error('Failed to get extensions')
    },
  })

  await expect(createViewInstance('sample.views.testing', 1, {}, '', 2)).resolves.toEqual({
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
    createError: new Error('create failed'),
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

  await expect(createViewInstance('sample.views.testing', 1, {}, '', 2)).resolves.toEqual({
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
    createError: new Error('create failed'),
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

  await createViewInstance('sample.views.testing', 1, {}, '', 2)
  await disposeViewInstance('sample.views.testing', 1, '', 2)

  expect(ExtensionViewInstanceState.get(1)).toBeUndefined()
  expect(mock.invocations).toEqual([['ExtensionApi.createViewInstance', 'sample.views.testing', 1, {}]])
})

test('view lifecycle calls no-op after failed createViewInstance', async () => {
  const mock = createRpc({
    createError: new Error('create failed'),
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

  await createViewInstance('sample.views.testing', 1, {}, '', 2)

  await expect(dispatchViewEvent('sample.views.testing', 1, { type: 'click' }, '', 2)).resolves.toBeUndefined()
  await expect(saveViewInstanceState('sample.views.testing', 1, '', 2)).resolves.toBeUndefined()
  expect(mock.invocations).toEqual([['ExtensionApi.createViewInstance', 'sample.views.testing', 1, {}]])
})

test('requestViewRerender asks renderer worker to rerender viewlet instance', async () => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'Viewlet.executeViewletCommand'() {},
  })

  await requestViewRerender(1)

  expect(state.rendererWorker.invocations).toEqual([['Viewlet.executeViewletCommand', 1, 'rerender']])
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
