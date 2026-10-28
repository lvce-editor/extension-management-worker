import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { FileSystemWorker, RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import { executeDiagnosticProvider, streamDiagnosticProvider } from '../src/parts/ExecuteDiagnosticProvider/ExecuteDiagnosticProvider.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

beforeEach(() => {
  ExtensionsState.reset()
  ExtensionsState.update({ platform: PlatformType.Electron })
})

afterEach(() => {
  IsolatedExtensionHostWorkerState.clear()
  ExtensionsState.reset()
})

test('diagnostic requests without a matching language avoid enablement filesystem reads', async () => {
  using renderer = RendererWorker.registerMockRpc({
    'Layout.getAssetDir': () => '/assets',
    'WebView.compatSharedProcessInvoke': () => '/config/disabled.json',
    'Workspace.getPath': () => '',
  })
  using files = FileSystemWorker.registerMockRpc({ 'FileSystem.exists': () => false })
  using shared = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions': () => [{ diagnosticProviders: [{ languageId: 'javascript' }], id: 'javascript', isolated: true }],
  })
  const messages: unknown[] = []
  for (let index = 0; index < 3; index++) {
    await streamDiagnosticProvider(
      ExtensionsState.get(),
      { languageId: 'plaintext' },
      {
        postMessage: (message) => {
          messages.push(message)
        },
      },
    )
  }
  expect(messages).toEqual(Array.from({ length: 3 }, () => [{ providerCount: 0, providerIds: [], type: 'providers' }, { type: 'done' }]).flat())
  expect(files.invocations).toEqual([])
  expect(renderer.invocations).toEqual([['Layout.getAssetDir']])
  expect(shared.invocations).toHaveLength(1)
})

test('matching default-disabled diagnostics can be enabled without a stale negative result', async () => {
  let enabled = false
  using _renderer = RendererWorker.registerMockRpc({
    'Layout.getAssetDir': () => '/assets',
    'WebView.compatSharedProcessInvoke': () => '/config/disabled.json',
    'Workspace.getPath': () => '',
  })
  using files = FileSystemWorker.registerMockRpc({
    'FileSystem.exists': () => true,
    'FileSystem.readFile': () =>
      JSON.stringify({ disabledExtensions: enabled ? [] : ['diagnostics'], enabledExtensions: enabled ? ['diagnostics'] : [] }),
  })
  using _shared = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions': () => [
      { diagnosticProviders: [{ languageId: 'plaintext' }], disabled: true, id: 'diagnostics', isolated: true },
    ],
  })
  const diagnostics = [{ message: 'example' }]
  IsolatedExtensionHostWorkerState.set('diagnostics', {
    dispose: async () => {},
    invoke: async () => diagnostics,
    invokeAndTransfer: async () => {},
    send() {},
  })
  expect(await executeDiagnosticProvider(ExtensionsState.get(), { languageId: 'plaintext' })).toEqual([])
  enabled = true
  expect(await executeDiagnosticProvider(ExtensionsState.get(), { languageId: 'plaintext' })).toEqual(diagnostics)
  expect(files.invocations.filter(([method]) => method === 'FileSystem.readFile')).toHaveLength(2)
})
