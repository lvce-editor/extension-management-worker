import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import * as ExecuteCommand from '../src/parts/ExecuteCommand/ExecuteCommand.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

let rendererWorker: DisposableMockRpc | undefined

afterEach(() => {
  ExtensionsState.reset()
  IsolatedExtensionHostWorkerState.clear()
  rendererWorker?.[Symbol.dispose]()
  rendererWorker = undefined
})

test('executeCommand executes the isolated worker that contributes the command', async () => {
  ExtensionsState.update({
    platform: 1,
    webExtensions: [
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
    ],
  })
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

  await expect(ExecuteCommand.executeCommand('isolatedAbout.openAbout')).resolves.toBe('executed')

  expect(invocations).toEqual(['ExtensionApi.executeCommand', 'isolatedAbout.openAbout'])
})

test('executeCommand falls back to renderer worker for non-isolated commands', async () => {
  ExtensionsState.update({
    platform: 1,
    webExtensions: [],
  })
  rendererWorker = RendererWorker.registerMockRpc({
    'About.showAbout': async () => 'renderer-result',
  })

  await expect(ExecuteCommand.executeCommand('About.showAbout')).resolves.toBe('renderer-result')

  expect(rendererWorker.invocations).toEqual([['About.showAbout']])
})
