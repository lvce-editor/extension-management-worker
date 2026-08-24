/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, jest, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { FileSystemWorker, RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { activateByEvent } from '../src/parts/ActivateByEvent/ActivateByEvent.ts'
import { commandMap } from '../src/parts/CommandMap/CommandMap.ts'
import { disableExtension2 } from '../src/parts/DisableExtension2/DisableExtension2.ts'
import { disableWorkspaceExtension } from '../src/parts/DisableWorkspaceExtension/DisableWorkspaceExtension.ts'
import { enableExtension2 } from '../src/parts/EnableExtension2/EnableExtension2.ts'
import { enableWorkspaceExtension } from '../src/parts/EnableWorkspaceExtension/EnableWorkspaceExtension.ts'
import { getAllExtensionsWithState } from '../src/parts/GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import { getExtension } from '../src/parts/GetExtension/GetExtension.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'
import * as WorkspaceExtensionEnablementStorage from '../src/parts/WorkspaceExtensionEnablementStorage/WorkspaceExtensionEnablementStorage.ts'

interface MockFileSystem {
  readonly directories: Set<string>
  readonly files: Map<string, string>
  readonly uris: string[]
}

const ConfigUri = 'file:///tmp/lvce-config'
const DefaultWorkspaceUri = 'memfs:///workspace'
const DefaultWorkspaceHash = 'f1bd7a902d47d1ec057e71861ce5dc95d6b91254450b9e877363c87d3cb1603c'
const DefaultStorageDirectoryUri = `${ConfigUri}/workspaces/${DefaultWorkspaceHash}`
const DefaultStorageUri = `${DefaultStorageDirectoryUri}/extension-enablement.json`
const WorkspaceTwoUri = 'memfs:///workspace-two'
const WorkspaceTwoHash = '49d020f60846a76d96e0915007a78c867345bd04b52154637495b53fc90d83cf'
const WorkspaceTwoStorageUri = `${ConfigUri}/workspaces/${WorkspaceTwoHash}/extension-enablement.json`

const state: {
  fileSystemWorker: DisposableMockRpc | undefined
  rendererWorker: DisposableMockRpc | undefined
  sharedProcess: DisposableMockRpc | undefined
} = {
  fileSystemWorker: undefined,
  rendererWorker: undefined,
  sharedProcess: undefined,
}

const createExtensionsState = (disabledIds: readonly string[] = []): ExtensionsState => {
  return {
    activatedExtensions: Object.create(null),
    cachedActivationEvents: Object.create(null),
    cachedExtensions: undefined,
    disabledIds,
    platform: PlatformType.Electron,
    runtimeStatuses: Object.create(null),
    webExtensions: [],
  }
}

const createMockFileSystem = (files: readonly [string, string][] = []): MockFileSystem => {
  return {
    directories: new Set([ConfigUri]),
    files: new Map(files),
    uris: [],
  }
}

const registerMocks = (mockFileSystem = createMockFileSystem(), getWorkspaceUri: () => string = () => DefaultWorkspaceUri): MockFileSystem => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'ExtensionManagement.handleExtensionsCacheInvalidated'() {},
    'WebView.compatSharedProcessInvoke'(command: string) {
      if (command !== 'Platform.getConfigUri') {
        throw new Error(`Unexpected shared process command: ${command}`)
      }
      return ConfigUri
    },
    'Workspace.getPath'() {
      return getWorkspaceUri()
    },
  })
  state.fileSystemWorker = FileSystemWorker.registerMockRpc({
    'FileSystem.exists'(uri: string) {
      mockFileSystem.uris.push(uri)
      return mockFileSystem.directories.has(uri) || mockFileSystem.files.has(uri)
    },
    'FileSystem.mkdir'(uri: string) {
      mockFileSystem.uris.push(uri)
      mockFileSystem.directories.add(uri)
    },
    'FileSystem.readFile'(uri: string) {
      mockFileSystem.uris.push(uri)
      const content = mockFileSystem.files.get(uri)
      if (content === undefined) {
        throw new Error(`File not found: ${uri}`)
      }
      return content
    },
    'FileSystem.writeFile'(uri: string, content: string) {
      mockFileSystem.uris.push(uri)
      mockFileSystem.files.set(uri, content)
    },
  })
  return mockFileSystem
}

const registerSharedProcess = (extensions: readonly any[] = []): void => {
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.disable'() {},
    'ExtensionManagement.enable'() {},
    'ExtensionManagement.getAllExtensions'() {
      return extensions
    },
    'LanguageServer.dispose'() {},
  })
}

afterEach(() => {
  jest.useRealTimers()
  IsolatedExtensionHostWorkerState.clear()
  WorkspaceExtensionEnablementStorage.clearCache()
  state.fileSystemWorker?.[Symbol.dispose]()
  state.rendererWorker?.[Symbol.dispose]()
  state.sharedProcess?.[Symbol.dispose]()
  state.fileSystemWorker = undefined
  state.rendererWorker = undefined
  state.sharedProcess = undefined
})

test('disableWorkspaceExtension stores state under the app config directory', async () => {
  const mockFileSystem = registerMocks()
  registerSharedProcess()
  IsolatedExtensionHostWorkerState.set('sample.extension', { dispose: async () => {} } as any)

  await disableWorkspaceExtension('sample.extension')

  expect(mockFileSystem.directories.has(DefaultStorageDirectoryUri)).toBe(true)
  expect(mockFileSystem.files.get(DefaultStorageUri)).toBe(
    '{\n  "disabledExtensions": [\n    "sample.extension"\n  ],\n  "enabledExtensions": [],\n  "workspace": "memfs:///workspace"\n}\n',
  )
  expect(mockFileSystem.files.keys().every((uri) => !uri.startsWith(`${DefaultWorkspaceUri}/`))).toBe(true)
  expect(state.sharedProcess?.invocations).toContainEqual(['LanguageServer.dispose', 'sample.extension'])
})

test('native workspace paths are canonicalized before hashing', async () => {
  const workspacePath = '/home/simon/Documents/project space#1'
  const workspaceHash = '9c5110c9d1e46a9eec31077241d00e8090d9adb7342649579b5678ca5b18086a'
  const storageUri = `${ConfigUri}/workspaces/${workspaceHash}/extension-enablement.json`
  const mockFileSystem = registerMocks(createMockFileSystem(), () => workspacePath)

  await disableWorkspaceExtension('sample.extension')

  expect(mockFileSystem.files.get(storageUri)).toContain('"workspace": "file:///home/simon/Documents/project%20space%231"')
})

test('windows workspace paths are canonicalized before hashing', async () => {
  const mockFileSystem = registerMocks(createMockFileSystem(), () => 'C:\\Users\\simon\\project space')

  await disableWorkspaceExtension('sample.extension')

  const content = mockFileSystem.files.values().next().value
  expect(content).toContain('"workspace": "file:///C:/Users/simon/project%20space"')
  expect(mockFileSystem.files.keys().every((uri) => uri.startsWith(`${ConfigUri}/workspaces/`))).toBe(true)
})

test('disableWorkspaceExtension appends without duplicating ids', async () => {
  const mockFileSystem = registerMocks()

  await disableWorkspaceExtension('sample.one')
  await disableWorkspaceExtension('sample.two')
  await disableWorkspaceExtension('sample.one')

  expect(JSON.parse(mockFileSystem.files.get(DefaultStorageUri) || '{}').disabledExtensions).toEqual(['sample.one', 'sample.two'])
})

test('enableWorkspaceExtension records an enabled workspace override', async () => {
  const mockFileSystem = registerMocks()

  await enableWorkspaceExtension('sample.extension')

  expect(JSON.parse(mockFileSystem.files.get(DefaultStorageUri) || '{}')).toEqual({
    disabledExtensions: [],
    enabledExtensions: ['sample.extension'],
    workspace: DefaultWorkspaceUri,
  })
})

test('workspace enable and disable overrides are mutually exclusive', async () => {
  const mockFileSystem = registerMocks()

  await enableWorkspaceExtension('sample.extension')
  await disableWorkspaceExtension('sample.extension')

  expect(JSON.parse(mockFileSystem.files.get(DefaultStorageUri) || '{}')).toEqual({
    disabledExtensions: ['sample.extension'],
    enabledExtensions: [],
    workspace: DefaultWorkspaceUri,
  })
})

test('workspace state is isolated by workspace hash', async () => {
  let workspaceUri = DefaultWorkspaceUri
  const mockFileSystem = registerMocks(createMockFileSystem(), () => workspaceUri)

  await disableWorkspaceExtension('sample.one')
  workspaceUri = WorkspaceTwoUri
  await enableWorkspaceExtension('sample.two')

  expect(JSON.parse(mockFileSystem.files.get(DefaultStorageUri) || '{}').disabledExtensions).toEqual(['sample.one'])
  expect(JSON.parse(mockFileSystem.files.get(WorkspaceTwoStorageUri) || '{}').enabledExtensions).toEqual(['sample.two'])
})

test('workspace state is cached independently for each workspace', async () => {
  let workspaceUri = DefaultWorkspaceUri
  const mockFileSystem = registerMocks(
    createMockFileSystem([
      [DefaultStorageUri, '{"disabledExtensions":["sample.one"]}'],
      [WorkspaceTwoStorageUri, '{"disabledExtensions":["sample.two"]}'],
    ]),
    () => workspaceUri,
  )

  await WorkspaceExtensionEnablementStorage.getWorkspaceExtensionEnablement()
  workspaceUri = WorkspaceTwoUri
  await WorkspaceExtensionEnablementStorage.getWorkspaceExtensionEnablement()
  workspaceUri = DefaultWorkspaceUri
  await WorkspaceExtensionEnablementStorage.getWorkspaceExtensionEnablement()

  expect(mockFileSystem.uris.filter((uri) => uri === DefaultStorageUri)).toHaveLength(2)
  expect(mockFileSystem.uris.filter((uri) => uri === WorkspaceTwoStorageUri)).toHaveLength(2)
})

test('workspace actions fail without an open workspace', async () => {
  const mockFileSystem = registerMocks(createMockFileSystem(), () => '')

  await expect(disableWorkspaceExtension('sample.extension')).rejects.toThrow('without an open workspace')
  await expect(enableWorkspaceExtension('sample.extension')).rejects.toThrow('without an open workspace')
  expect(mockFileSystem.files).toEqual(new Map())
})

test('malformed workspace state is ignored while reading effective extensions', async () => {
  registerMocks(createMockFileSystem([[DefaultStorageUri, 'not json']]))
  registerSharedProcess([{ id: 'sample.extension' }])

  await expect(getAllExtensionsWithState(createExtensionsState(), '/assets', PlatformType.Electron)).resolves.toEqual([{ id: 'sample.extension' }])
})

test('malformed workspace state is not overwritten by a workspace action', async () => {
  registerMocks(createMockFileSystem([[DefaultStorageUri, 'not json']]))

  await expect(disableWorkspaceExtension('sample.extension')).rejects.toBeInstanceOf(SyntaxError)
})

test('command map exposes workspace enable and disable commands', () => {
  expect(commandMap['Extensions.disableWorkspace']).toBe(disableWorkspaceExtension)
  expect(commandMap['Extensions.enableWorkspace']).toBe(enableWorkspaceExtension)
})

test('workspace disable overrides a globally enabled extension', async () => {
  registerMocks(createMockFileSystem([[DefaultStorageUri, '{"disabledExtensions":["sample.extension"]}']]))
  registerSharedProcess([{ id: 'sample.extension' }])

  await expect(getAllExtensionsWithState(createExtensionsState(), '/assets', PlatformType.Electron)).resolves.toEqual([
    { disabled: true, id: 'sample.extension' },
  ])
})

test('workspace enable overrides a globally disabled extension', async () => {
  registerMocks(createMockFileSystem([[DefaultStorageUri, '{"enabledExtensions":["sample.extension"]}']]))
  registerSharedProcess([{ id: 'sample.extension' }])

  await expect(getAllExtensionsWithState(createExtensionsState(), '/assets', PlatformType.Electron)).resolves.toEqual([{ id: 'sample.extension' }])
})

test('getExtension reports globally enabled state when there is no override', async () => {
  registerMocks()
  registerSharedProcess([{ id: 'sample.extension' }])

  await expect(getExtension('sample.extension', '/assets', PlatformType.Electron)).resolves.toEqual({
    enablementState: 'enabledGlobally',
    hasWorkspace: true,
    id: 'sample.extension',
  })
})

test('getExtension reports workspace disabled state', async () => {
  registerMocks(createMockFileSystem([[DefaultStorageUri, '{"disabledExtensions":["sample.extension"]}']]))
  registerSharedProcess([{ id: 'sample.extension' }])

  await expect(getExtension('sample.extension', '/assets', PlatformType.Electron)).resolves.toEqual({
    disabled: true,
    enablementState: 'disabledWorkspace',
    hasWorkspace: true,
    id: 'sample.extension',
  })
})

test('global enable clears the current workspace override', async () => {
  const mockFileSystem = registerMocks(createMockFileSystem([[DefaultStorageUri, '{"disabledExtensions":["sample.extension"]}']]))
  registerSharedProcess()

  await enableExtension2('sample.extension', PlatformType.Electron)

  expect(JSON.parse(mockFileSystem.files.get(DefaultStorageUri) || '{}')).toMatchObject({ disabledExtensions: [], enabledExtensions: [] })
  expect(state.sharedProcess?.invocations).toContainEqual(['ExtensionManagement.enable', 'sample.extension'])
})

test('global disable clears the current workspace override', async () => {
  jest.useFakeTimers()
  const mockFileSystem = registerMocks(createMockFileSystem([[DefaultStorageUri, '{"enabledExtensions":["sample.extension"]}']]))
  registerSharedProcess()

  await disableExtension2('sample.extension', PlatformType.Electron)
  await jest.runAllTimersAsync()

  expect(JSON.parse(mockFileSystem.files.get(DefaultStorageUri) || '{}')).toMatchObject({ disabledExtensions: [], enabledExtensions: [] })
  expect(state.sharedProcess?.invocations).toContainEqual(['ExtensionManagement.disable', 'sample.extension'])
})

test('activateByEvent skips workspace disabled extensions', async () => {
  registerMocks(createMockFileSystem([[DefaultStorageUri, '{"disabledExtensions":["sample.disabled"]}']]))
  registerSharedProcess([
    {
      activation: ['onCommand:test'],
      id: 'sample.disabled',
      isolated: true,
    },
  ])

  await expect(activateByEvent('onCommand:test', '/assets', PlatformType.Electron)).resolves.toEqual({
    error: undefined,
    hasActivatedExtensions: false,
  })
})
