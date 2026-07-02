import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { createViewInstance, dispatchViewEvent, disposeViewInstance, saveViewInstanceState } from '../src/parts/ExtensionView/ExtensionView.ts'
import * as ExtensionViewInstanceState from '../src/parts/ExtensionViewInstanceState/ExtensionViewInstanceState.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const state: {
  sharedProcess: DisposableMockRpc | undefined
} = {
  sharedProcess: undefined,
}

const createRpc = (
  options: { readonly createError?: Error } = {},
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
          type: 'setDom',
        }
      }
      if (method === 'ExtensionApi.dispatchViewEvent') {
        return {
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
  state.sharedProcess?.[Symbol.dispose]()
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
