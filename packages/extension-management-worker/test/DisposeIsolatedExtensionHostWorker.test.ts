import { beforeEach, expect, jest, test } from '@jest/globals'
import { disposeIsolatedExtensionHostWorker } from '../src/parts/DisposeIsolatedExtensionHostWorker/DisposeIsolatedExtensionHostWorker.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

beforeEach(() => {
  ExtensionsState.reset()
  IsolatedExtensionHostWorkerState.clear()
})

test('disposeIsolatedExtensionHostWorker disposes and removes the worker', async () => {
  const dispose = jest.fn(async () => {})
  const invoke = jest.fn<(...args: readonly any[]) => Promise<any>>(async () => {})
  IsolatedExtensionHostWorkerState.set('sample.extension', { dispose } as any)

  await expect(disposeIsolatedExtensionHostWorker('sample.extension', invoke)).resolves.toBe(true)

  expect(invoke).toHaveBeenCalledWith('LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker', 'sample.extension')
  expect(dispose).toHaveBeenCalledTimes(1)
  expect(IsolatedExtensionHostWorkerState.get('sample.extension')).toBeUndefined()
})

test('disposeIsolatedExtensionHostWorker clears runtime activation state', async () => {
  const activation = Promise.resolve()
  IsolatedExtensionHostWorkerState.set('sample.extension', { dispose: async () => {} } as any)
  ExtensionsState.update({
    activatedExtensions: { 'sample.extension': activation, 'sample.other': activation },
    cachedActivationEvents: { 'sample.extension': activation, 'sample.other': activation },
    runtimeStatuses: {
      'sample.extension': {
        activationEndTime: 2,
        activationEvent: 'onStatusBarItem',
        activationStartTime: 1,
        activationTime: 1,
        id: 'sample.extension',
        importEndTime: 0,
        importStartTime: 0,
        importTime: 0,
        status: 2,
      },
      'sample.other': {
        activationEndTime: 2,
        activationEvent: 'onCommand:test',
        activationStartTime: 1,
        activationTime: 1,
        id: 'sample.other',
        importEndTime: 0,
        importStartTime: 0,
        importTime: 0,
        status: 2,
      },
    },
  })

  await disposeIsolatedExtensionHostWorker('sample.extension')

  expect(ExtensionsState.get().activatedExtensions).toEqual({ 'sample.other': activation })
  expect(ExtensionsState.get().cachedActivationEvents).toEqual({ 'sample.other': activation })
  expect(ExtensionsState.get().runtimeStatuses).toEqual({
    'sample.other': expect.objectContaining({
      id: 'sample.other',
    }),
  })
})

test('disposeIsolatedExtensionHostWorker is a no-op when no worker exists', async () => {
  await expect(disposeIsolatedExtensionHostWorker('sample.extension')).resolves.toBe(false)
})

test('disposeIsolatedExtensionHostWorker removes state when disposal rejects', async () => {
  IsolatedExtensionHostWorkerState.set('sample.extension', {
    async dispose() {
      throw new Error('Failed to dispose worker')
    },
  } as any)

  await expect(disposeIsolatedExtensionHostWorker('sample.extension')).resolves.toBe(true)
  expect(IsolatedExtensionHostWorkerState.get('sample.extension')).toBeUndefined()
})

test('disposeIsolatedExtensionHostWorker still closes the rpc when renderer disposal rejects', async () => {
  const dispose = jest.fn(async () => {})
  const invoke = jest.fn<(...args: readonly any[]) => Promise<any>>(async () => {
    throw new Error('Renderer does not support worker disposal')
  })
  IsolatedExtensionHostWorkerState.set('sample.extension', { dispose } as any)

  await expect(disposeIsolatedExtensionHostWorker('sample.extension', invoke)).resolves.toBe(true)

  expect(dispose).toHaveBeenCalledTimes(1)
})
