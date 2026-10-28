import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { FileSystemWorker, RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import { executeProvidersByEvent } from '../src/parts/ExecuteProvidersByEvent/ExecuteProvidersByEvent.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { getAllExtensionsWithState } from '../src/parts/GetAllExtensionsWithState/GetAllExtensionsWithState.ts'

beforeEach(() => {
  ExtensionsState.reset()
  ExtensionsState.update({ platform: PlatformType.Electron })
})

afterEach(() => {
  ExtensionsState.reset()
})

test('unmatched provider events do not read global or workspace enablement', async () => {
  using renderer = RendererWorker.registerMockRpc({
    'Layout.getAssetDir': () => '/assets',
    'WebView.compatSharedProcessInvoke': () => '/config/disabled.json',
    'Workspace.getPath': () => '',
  })
  using files = FileSystemWorker.registerMockRpc({
    'FileSystem.exists': () => false,
  })
  using shared = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions': () => [{ activation: ['onDebug:node'], id: 'debug', isolated: true }],
  })

  for (let index = 0; index < 3; index++) {
    await expect(
      executeProvidersByEvent(ExtensionsState.get(), 'onEditorTextDecoration', 'ExtensionApi.executeEditorTextDecorationProvider', {}),
    ).resolves.toEqual([])
  }
  expect(files.invocations).toEqual([])
  expect(renderer.invocations).toEqual([['Layout.getAssetDir'], ['Layout.getAssetDir'], ['Layout.getAssetDir']])
  expect(shared.invocations).toHaveLength(1)
})

test('matching providers keep reading current enablement instead of caching a disabled result', async () => {
  let enabled = false
  using renderer = RendererWorker.registerMockRpc({
    'WebView.compatSharedProcessInvoke': () => '/config/disabled.json',
    'Workspace.getPath': () => '',
  })
  using files = FileSystemWorker.registerMockRpc({
    'FileSystem.exists': () => true,
    'FileSystem.readFile': () =>
      JSON.stringify({ disabledExtensions: enabled ? [] : ['decoration'], enabledExtensions: enabled ? ['decoration'] : [] }),
  })
  using shared = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions': () => [{ activation: ['onEditorTextDecoration'], disabled: true, id: 'decoration', isolated: true }],
  })
  const query = () => getAllExtensionsWithState(ExtensionsState.get(), '/assets', PlatformType.Electron, undefined, 'onEditorTextDecoration')
  expect(await query()).toEqual([expect.objectContaining({ disabled: true, id: 'decoration' })])
  enabled = true
  expect(await query()).toEqual([expect.objectContaining({ disabled: false, id: 'decoration' })])
  expect(files.invocations.filter(([method]) => method === 'FileSystem.readFile')).toHaveLength(2)
})

test('a newly registered matching manifest is visible after an empty lookup', async () => {
  using renderer = RendererWorker.registerMockRpc({
    'WebView.compatSharedProcessInvoke': () => '/config/disabled.json',
    'Workspace.getPath': () => '',
  })
  using files = FileSystemWorker.registerMockRpc({ 'FileSystem.exists': () => false })
  using shared = SharedProcess.registerMockRpc({ 'ExtensionManagement.getAllExtensions': () => [] })
  const query = () => getAllExtensionsWithState(ExtensionsState.get(), '/assets', PlatformType.Electron, undefined, 'onEditorTextDecoration')
  expect(await query()).toEqual([])
  const manifest = { activation: ['onEditorTextDecoration'], id: 'dynamic', isolated: true }
  ExtensionsState.addExtension(manifest)
  expect(await query()).toEqual([manifest])
})

test('application manifest overrides are resolved before filtering activation events', async () => {
  const applicationId = 'event-filter-application'
  ExtensionsState.createApplication(applicationId, PlatformType.Electron, [{ activation: ['other'], id: 'same-id', isolated: true }])
  using shared = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions': () => [{ activation: ['onEditorTextDecoration'], id: 'same-id', isolated: true }],
  })
  try {
    expect(
      await getAllExtensionsWithState(ExtensionsState.get(applicationId), '/assets', PlatformType.Electron, undefined, 'onEditorTextDecoration'),
    ).toEqual([])
  } finally {
    ExtensionsState.removeApplication(applicationId)
  }
})
