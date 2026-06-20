import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as ExecuteCommand from '../src/parts/ExecuteCommand/ExecuteCommand.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const state: { rendererWorker: DisposableMockRpc | undefined } = {
  rendererWorker: undefined,
}

const { dispose } = Symbol

const createExtensionsState = (webExtensions: readonly any[]): ExtensionsState => {
  return {
    activatedExtensions: Object.create(null),
    cachedActivationEvents: Object.create(null),
    cachedExtensions: undefined,
    disabledIds: [],
    platform: 1,
    runtimeStatuses: Object.create(null),
    webExtensions,
  }
}

afterEach(() => {
  IsolatedExtensionHostWorkerState.clear()
  state.rendererWorker?.[dispose]()
  state.rendererWorker = undefined
})

test('executeCommand executes the isolated worker that contributes the command', async () => {
  const extensionsState = createExtensionsState([
    {
      activation: ['onCommand:isolatedAbout.openAbout'],
      commands: [
        {
          id: 'isolatedAbout.openAbout',
        },
      ],
      id: 'sample.isolated-extension-command-about',
      isolated: true,
    },
  ])
  const invocations: unknown[] = []
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...params: readonly unknown[]): Promise<string> => {
      invocations.push(method, ...params)
      return 'executed'
    },
    invokeAndTransfer: async (): Promise<void> => {},
    send: (): void => {},
  }
  IsolatedExtensionHostWorkerState.set('sample.isolated-extension-command-about', rpc)

  await expect(ExecuteCommand.executeCommand(extensionsState, 'isolatedAbout.openAbout')).resolves.toBe('executed')

  expect(invocations).toEqual(['ExtensionApi.executeCommand', 'isolatedAbout.openAbout'])
})

test('executeCommand falls back to renderer worker for non-isolated commands', async () => {
  const extensionsState = createExtensionsState([])
  state.rendererWorker = RendererWorker.registerMockRpc({
    'About.showAbout': async () => 'renderer-result',
  })

  await expect(ExecuteCommand.executeCommand(extensionsState, 'About.showAbout')).resolves.toBe('renderer-result')

  expect(state.rendererWorker.invocations).toEqual([['About.showAbout']])
})
