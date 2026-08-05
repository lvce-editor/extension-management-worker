import type { Rpc } from '@lvce-editor/rpc'
import { afterEach, expect, test } from '@jest/globals'
import { activateExtension3 } from '../src/parts/ActivateExtension3/ActivateExtension3.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { getRunningExtensionsFromState } from '../src/parts/GetRunningExtensionsFromState/GetRunningExtensionsFromState.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const createRpc = (): Rpc => ({
  dispose: async () => {},
  invoke: async () => undefined,
  invokeAndTransfer: async () => undefined,
  send: () => {},
})

afterEach(() => {
  ExtensionsState.reset()
  IsolatedExtensionHostWorkerState.clear()
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
  expect(ExtensionsState.getRuntimeStatus('sample.explicit')).toEqual(
    expect.objectContaining({
      activationEvent: 'onStart',
      id: 'sample.explicit',
      status: 3,
    }),
  )
  expect(ExtensionsState.getRuntimeStatus('sample.inferred')).toEqual(
    expect.objectContaining({
      activationEvent: 'onStart',
      id: 'sample.inferred',
      status: 3,
    }),
  )
  expect(getRunningExtensionsFromState([{ id: 'sample.explicit', name: 'Sample Extension' }], ExtensionsState.get().runtimeStatuses, '', 2)).toEqual([
    expect.objectContaining({
      activationEvent: 'onStart',
      id: 'sample.explicit',
      name: 'Sample Extension',
    }),
  ])
})

test('activateExtension3 rejects extensions that do not use the isolated API', async () => {
  await expect(activateExtension3({ id: 'sample.legacy' }, '/extensions/legacy/main.js', 'onStart', 2)).rejects.toThrow(
    'Extension sample.legacy does not use the isolated extension API',
  )
  expect(IsolatedExtensionHostWorkerState.get('sample.legacy')).toBeUndefined()
})
