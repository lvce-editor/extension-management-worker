import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, jest, test } from '@jest/globals'
import { ExtensionHost } from '@lvce-editor/rpc-registry'
import { activateExtension2 } from '../src/parts/ActivateExtension2/ActivateExtension2.ts'
import { activateExtension3 } from '../src/parts/ActivateExtension3/ActivateExtension3.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { importExtension } from '../src/parts/ImportExtension/ImportExtension.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch')
const state: { extensionHost: DisposableMockRpc | undefined } = {
  extensionHost: undefined,
}

const createRpc = (): Rpc => ({
  dispose: async () => {},
  invoke: async () => undefined,
  invokeAndTransfer: async () => undefined,
  send: () => {},
})

afterEach(() => {
  jest.useRealTimers()
  ExtensionsState.reset()
  IsolatedExtensionHostWorkerState.clear()
  state.extensionHost?.[Symbol.dispose]()
  state.extensionHost = undefined
  if (originalFetch) {
    Object.defineProperty(globalThis, 'fetch', originalFetch)
  } else {
    delete (globalThis as any).fetch
  }
})

test('activateExtension2 records successful activation using the default extension host', async () => {
  jest.useFakeTimers()
  state.extensionHost = ExtensionHost.registerMockRpc({
    'ExtensionHost.activateExtension3'() {},
  })

  await activateExtension2('sample.extension', { id: 'sample.extension' }, '/extensions/sample/main.js')
  await jest.runAllTimersAsync()

  expect(state.extensionHost.invocations).toEqual([['ExtensionHost.activateExtension3', 'sample.extension', { id: 'sample.extension' }]])
  expect(ExtensionsState.getRuntimeStatus('sample.extension')).toEqual(
    expect.objectContaining({
      id: 'sample.extension',
      status: 3,
    }),
  )
})

test('activateExtension2 reports activation timeouts', async () => {
  jest.useFakeTimers()
  const extensionHost = {
    invoke: async (): Promise<never> => new Promise(() => {}),
  }

  const activation = activateExtension2('sample.extension', { id: 'sample.extension' }, '/extensions/sample/main.js', extensionHost)
  // Attach a rejection handler before advancing timers so Node does not report an unhandled rejection.
  // eslint-disable-next-line unicorn/prefer-await
  const activationError = activation.catch((error) => error)
  await jest.advanceTimersByTimeAsync(10_000)
  const error = await activationError

  expect(error).toBeInstanceOf(Error)
  expect(error.message).toContain('Activation timeout of 10000ms exceeded')
  expect(ExtensionsState.getRuntimeStatus('sample.extension')).toEqual(expect.objectContaining({ status: 4 }))
})

test('activateExtension2 provides the actual message for import errors', async () => {
  jest.useFakeTimers()
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (): Promise<Response> => ({ ok: false, status: 500 }) as Response,
  })
  const importError = new Error('Failed to fetch dynamically imported module: https://example.com/main.js')
  const extensionHost = {
    invoke: async (): Promise<void> => {
      throw importError
    },
  }

  await expect(activateExtension2('sample.extension', { id: 'sample.extension' }, 'https://example.com/main.js', extensionHost)).rejects.toThrow(
    'Failed to activate extension sample.extension: Failed to import https://example.com/main.js',
  )
  await jest.runAllTimersAsync()
})

test('importExtension records success and wraps generic failures', async () => {
  const successfulHost = {
    invoke: async (): Promise<void> => {},
  }
  await importExtension('sample.success', '/extensions/success/main.js', 'onCommand:success', successfulHost)
  expect(ExtensionsState.getRuntimeStatus('sample.success')).toEqual(
    expect.objectContaining({
      activationEvent: 'onCommand:success',
      id: 'sample.success',
      status: 1,
    }),
  )

  const failingHost = {
    invoke: async (): Promise<void> => {
      throw new Error('generic import failure')
    },
  }
  await expect(importExtension('sample.failure', '/extensions/failure/main.js', 'onCommand:failure', failingHost)).rejects.toThrow(
    'Failed to import extension sample.failure: generic import failure',
  )
  expect(ExtensionsState.getRuntimeStatus('sample.failure')).toEqual(expect.objectContaining({ status: 4 }))
})

test('importExtension resolves browser import error details', async () => {
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (): Promise<Response> => ({ ok: false, status: 500 }) as Response,
  })
  const extensionHost = {
    invoke: async (): Promise<void> => {
      throw new Error('Failed to fetch dynamically imported module: https://example.com/main.js')
    },
  }

  await expect(importExtension('sample.extension', 'https://example.com/main.js', 'onCommand:sample', extensionHost)).rejects.toThrow(
    'Failed to import extension sample.extension: Failed to import https://example.com/main.js',
  )
})

test('activateExtension3 reuses isolated workers with explicit and inferred ids', async () => {
  const explicitRpc = createRpc()
  const inferredRpc = createRpc()
  IsolatedExtensionHostWorkerState.set('sample.explicit', explicitRpc)
  IsolatedExtensionHostWorkerState.set('sample.inferred', inferredRpc)

  await activateExtension3({ id: 'sample.explicit', isolated: true, workerName: 'Sample Worker' }, '/extensions/explicit/main.js', 'onStart', 2)
  await activateExtension3({ isolated: true, uri: '/extensions/sample.inferred' }, '/extensions/inferred/main.js', 'onStart', 2)

  expect(IsolatedExtensionHostWorkerState.get('sample.explicit')).toBe(explicitRpc)
  expect(IsolatedExtensionHostWorkerState.get('sample.inferred')).toBe(inferredRpc)
})

test('activateExtension3 imports and activates non-isolated extensions', async () => {
  jest.useFakeTimers()
  state.extensionHost = ExtensionHost.registerMockRpc({
    'ExtensionHost.activateExtension3'() {},
    'ExtensionHost.importExtension2'() {},
  })

  await activateExtension3({ id: 'sample.extension' }, '/extensions/sample/main.js', 'onStart', 2)
  await jest.runAllTimersAsync()

  expect(state.extensionHost.invocations).toEqual([
    ['ExtensionHost.importExtension2', 'sample.extension', '/extensions/sample/main.js'],
    ['ExtensionHost.activateExtension3', 'sample.extension', { id: 'sample.extension' }],
  ])
})
