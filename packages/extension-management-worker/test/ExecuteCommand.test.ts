import { afterEach, expect, jest, test } from '@jest/globals'

const rendererInvoke = jest.fn()

jest.unstable_mockModule('@lvce-editor/rpc-registry', () => {
  const mockRpc = {
    invoke: jest.fn(),
    invokeAndTransfer: jest.fn(),
    set: jest.fn(),
  }
  return {
    ExtensionHost: mockRpc,
    FileSystemWorker: mockRpc,
    IframeWorker: mockRpc,
    RendererWorker: {
      invoke: rendererInvoke,
      invokeAndTransfer: jest.fn(),
      set: jest.fn(),
    },
    SharedProcess: mockRpc,
  }
})

const ExecuteCommand = await import('../src/parts/ExecuteCommand/ExecuteCommand.ts')
const ExtensionsState = await import('../src/parts/ExtensionsState/ExtensionsState.ts')
const IsolatedExtensionHostWorkerState = await import('../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts')

afterEach(() => {
  ExtensionsState.reset()
  IsolatedExtensionHostWorkerState.clear()
  rendererInvoke.mockReset()
})

test('executeCommand executes the isolated worker that contributes the command', async () => {
  ExtensionsState.update({
    platform: 1,
    webExtensions: [
      {
        id: 'sample.isolated-extension-command-about',
        isolated: true,
        activation: ['onCommand:isolatedAbout.openAbout'],
        commands: [
          {
            id: 'isolatedAbout.openAbout',
          },
        ],
      },
    ],
  })
  const invoke = jest.fn(async () => 'executed')
  IsolatedExtensionHostWorkerState.set('sample.isolated-extension-command-about', {
    invoke,
  } as any)

  await expect(ExecuteCommand.executeCommand('isolatedAbout.openAbout')).resolves.toBe('executed')

  expect(invoke).toHaveBeenCalledWith('ExtensionApi.executeCommand', 'isolatedAbout.openAbout')
  expect(rendererInvoke).not.toHaveBeenCalled()
})

test('executeCommand falls back to renderer worker for non-isolated commands', async () => {
  ExtensionsState.update({
    platform: 1,
    webExtensions: [],
  })
  rendererInvoke.mockResolvedValue('renderer-result')

  await expect(ExecuteCommand.executeCommand('About.showAbout')).resolves.toBe('renderer-result')

  expect(rendererInvoke).toHaveBeenCalledWith('About.showAbout')
})
