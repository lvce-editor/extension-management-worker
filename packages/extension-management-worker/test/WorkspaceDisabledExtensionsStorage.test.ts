/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { FileSystemWorker, RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { activateByEvent } from '../src/parts/ActivateByEvent/ActivateByEvent.ts'
import { commandMap } from '../src/parts/CommandMap/CommandMap.ts'
import { disableWorkspaceExtension } from '../src/parts/DisableWorkspaceExtension/DisableWorkspaceExtension.ts'
import { enableWorkspaceExtension } from '../src/parts/EnableWorkspaceExtension/EnableWorkspaceExtension.ts'
import { getAllExtensionsWithState } from '../src/parts/GetAllExtensionsWithState/GetAllExtensionsWithState.ts'

interface MockFileSystem {
  readonly directories: Set<string>
  readonly files: Map<string, string>
  readonly uris: string[]
}

const DefaultWorkspaceUri = 'memfs:///workspace'
const UriSchemeRegex = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//

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

const assertUri = (uri: string): void => {
  if (!UriSchemeRegex.test(uri)) {
    throw new Error(`Expected file system uri, got ${uri}`)
  }
}

const recordUri = (mockFileSystem: MockFileSystem, uri: string): void => {
  assertUri(uri)
  mockFileSystem.uris.push(uri)
}

const createMockFileSystem = (files: readonly [string, string][] = [], directories: readonly string[] = [DefaultWorkspaceUri]): MockFileSystem => {
  return {
    directories: new Set(directories),
    files: new Map(files),
    uris: [],
  }
}

const registerMocks = (mockFileSystem = createMockFileSystem(), workspacePath = DefaultWorkspaceUri): MockFileSystem => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'ExtensionManagement.handleExtensionsCacheInvalidated'() {},
    'Workspace.getPath'() {
      return workspacePath
    },
  })
  state.fileSystemWorker = FileSystemWorker.registerMockRpc({
    'FileSystem.exists'(uri: string) {
      recordUri(mockFileSystem, uri)
      return mockFileSystem.directories.has(uri) || mockFileSystem.files.has(uri)
    },
    'FileSystem.mkdir'(uri: string) {
      recordUri(mockFileSystem, uri)
      mockFileSystem.directories.add(uri)
    },
    'FileSystem.readFile'(uri: string) {
      recordUri(mockFileSystem, uri)
      const content = mockFileSystem.files.get(uri)
      if (content === undefined) {
        throw new Error(`File not found: ${uri}`)
      }
      return content
    },
    'FileSystem.writeFile'(uri: string, content: string) {
      recordUri(mockFileSystem, uri)
      mockFileSystem.files.set(uri, content)
    },
  })
  return mockFileSystem
}

afterEach(() => {
  state.fileSystemWorker?.[Symbol.dispose]()
  state.rendererWorker?.[Symbol.dispose]()
  state.sharedProcess?.[Symbol.dispose]()
  state.fileSystemWorker = undefined
  state.rendererWorker = undefined
  state.sharedProcess = undefined
})

test('disableWorkspaceExtension creates workspace disabled extensions file', async () => {
  const mockFileSystem = registerMocks()

  await disableWorkspaceExtension('sample.extension')

  expect(mockFileSystem.directories.has('memfs:///workspace/.lvce')).toBe(true)
  expect(mockFileSystem.files.get('memfs:///workspace/.lvce/disabled-extensions.json')).toBe(
    '{\n  "disabledExtensions": [\n    "sample.extension"\n  ]\n}\n',
  )
})

test('disableWorkspaceExtension converts native workspace path to file uri', async () => {
  const workspacePath = '/home/simon/Documents/project space#1'
  const workspaceUri = 'file:///home/simon/Documents/project%20space%231'
  const mockFileSystem = registerMocks(createMockFileSystem([], [workspaceUri]), workspacePath)

  await disableWorkspaceExtension('sample.extension')

  expect(mockFileSystem.directories.has(`${workspaceUri}/.lvce`)).toBe(true)
  expect(mockFileSystem.files.get(`${workspaceUri}/.lvce/disabled-extensions.json`)).toBe(
    '{\n  "disabledExtensions": [\n    "sample.extension"\n  ]\n}\n',
  )
  expect(mockFileSystem.uris).toEqual([
    `${workspaceUri}/.lvce`,
    `${workspaceUri}/.lvce`,
    `${workspaceUri}/.lvce/disabled-extensions.json`,
    `${workspaceUri}/.lvce/disabled-extensions.json`,
  ])
})

test('disableWorkspaceExtension converts windows workspace path to file uri', async () => {
  const workspacePath = 'C:\\Users\\simon\\project space'
  const workspaceUri = 'file:///C:/Users/simon/project%20space'
  const mockFileSystem = registerMocks(createMockFileSystem([], [workspaceUri]), workspacePath)

  await disableWorkspaceExtension('sample.extension')

  expect(mockFileSystem.files.get(`${workspaceUri}/.lvce/disabled-extensions.json`)).toBe(
    '{\n  "disabledExtensions": [\n    "sample.extension"\n  ]\n}\n',
  )
  expect(mockFileSystem.uris.every((uri) => uri.startsWith('file:///'))).toBe(true)
})

test('disableWorkspaceExtension appends to existing disabled extensions', async () => {
  const mockFileSystem = registerMocks(
    createMockFileSystem([['memfs:///workspace/.lvce/disabled-extensions.json', '{\n  "disabledExtensions": [\n    "sample.one"\n  ]\n}\n']]),
  )
  mockFileSystem.directories.add('memfs:///workspace/.lvce')

  await disableWorkspaceExtension('sample.two')

  expect(mockFileSystem.files.get('memfs:///workspace/.lvce/disabled-extensions.json')).toBe(
    '{\n  "disabledExtensions": [\n    "sample.one",\n    "sample.two"\n  ]\n}\n',
  )
})

test('disableWorkspaceExtension does not duplicate existing ids', async () => {
  const mockFileSystem = registerMocks(
    createMockFileSystem([['memfs:///workspace/.lvce/disabled-extensions.json', '{\n  "disabledExtensions": [\n    "sample.extension"\n  ]\n}\n']]),
  )
  mockFileSystem.directories.add('memfs:///workspace/.lvce')

  await disableWorkspaceExtension('sample.extension')

  expect(mockFileSystem.files.get('memfs:///workspace/.lvce/disabled-extensions.json')).toBe(
    '{\n  "disabledExtensions": [\n    "sample.extension"\n  ]\n}\n',
  )
})

test('enableWorkspaceExtension removes one id and preserves others', async () => {
  const mockFileSystem = registerMocks(
    createMockFileSystem([
      ['memfs:///workspace/.lvce/disabled-extensions.json', '{\n  "disabledExtensions": [\n    "sample.one",\n    "sample.two"\n  ]\n}\n'],
    ]),
  )
  mockFileSystem.directories.add('memfs:///workspace/.lvce')

  await enableWorkspaceExtension('sample.one')

  expect(mockFileSystem.files.get('memfs:///workspace/.lvce/disabled-extensions.json')).toBe(
    '{\n  "disabledExtensions": [\n    "sample.two"\n  ]\n}\n',
  )
})

test('enableWorkspaceExtension keeps an empty file when removing the last id', async () => {
  const mockFileSystem = registerMocks(
    createMockFileSystem([['memfs:///workspace/.lvce/disabled-extensions.json', '{\n  "disabledExtensions": [\n    "sample.extension"\n  ]\n}\n']]),
  )
  mockFileSystem.directories.add('memfs:///workspace/.lvce')

  await enableWorkspaceExtension('sample.extension')

  expect(mockFileSystem.files.get('memfs:///workspace/.lvce/disabled-extensions.json')).toBe('{\n  "disabledExtensions": []\n}\n')
})

test('enableWorkspaceExtension is a no-op when the file does not exist', async () => {
  const mockFileSystem = registerMocks()

  await enableWorkspaceExtension('sample.extension')

  expect(mockFileSystem.files.has('memfs:///workspace/.lvce/disabled-extensions.json')).toBe(false)
})

test('disableWorkspaceExtension rejects invalid json', async () => {
  const mockFileSystem = registerMocks(createMockFileSystem([['memfs:///workspace/.lvce/disabled-extensions.json', 'not json']]))
  mockFileSystem.directories.add('memfs:///workspace/.lvce')

  await expect(disableWorkspaceExtension('sample.extension')).rejects.toBeInstanceOf(SyntaxError)
})

test('commandMap exposes workspace enable and disable commands', () => {
  expect(commandMap['Extensions.disableWorkspace']).toBe(disableWorkspaceExtension)
  expect(commandMap['Extensions.enableWorkspace']).toBe(enableWorkspaceExtension)
})

test('getAllExtensionsWithState marks workspace disabled extensions', async () => {
  const mockFileSystem = registerMocks(
    createMockFileSystem([['memfs:///workspace/.lvce/disabled-extensions.json', '{\n  "disabledExtensions": [\n    "sample.disabled"\n  ]\n}\n']]),
  )
  mockFileSystem.directories.add('memfs:///workspace/.lvce')
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [
        {
          id: 'sample.enabled',
        },
        {
          id: 'sample.disabled',
        },
      ]
    },
  })

  await expect(getAllExtensionsWithState(createExtensionsState(), '/assets', PlatformType.Electron)).resolves.toEqual([
    {
      id: 'sample.enabled',
    },
    {
      disabled: true,
      id: 'sample.disabled',
    },
  ])
})

test('getAllExtensionsWithState applies test disabled state without reading workspace disabled extensions', async () => {
  const mockFileSystem = registerMocks()
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [
        {
          id: 'sample.extension',
        },
      ]
    },
  })

  await expect(getAllExtensionsWithState(createExtensionsState(['sample.extension']), '/assets', PlatformType.Test)).resolves.toEqual([
    {
      disabled: true,
      id: 'sample.extension',
    },
  ])
  expect(mockFileSystem.uris).toEqual([])
})

test('activateByEvent skips workspace disabled extensions', async () => {
  const mockFileSystem = registerMocks(
    createMockFileSystem([['memfs:///workspace/.lvce/disabled-extensions.json', '{\n  "disabledExtensions": [\n    "sample.disabled"\n  ]\n}\n']]),
  )
  mockFileSystem.directories.add('memfs:///workspace/.lvce')
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [
        {
          activation: ['onCommand:test'],
          id: 'sample.disabled',
          isolated: true,
        },
      ]
    },
  })

  await expect(activateByEvent('onCommand:test', '/assets', PlatformType.Electron)).resolves.toEqual({
    error: undefined,
    hasActivatedExtensions: false,
  })
})
