import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { FileSystemWorker, RendererWorker } from '@lvce-editor/rpc-registry'
import { enableExtension2 } from '../src/parts/EnableExtension2/EnableExtension2.ts'

const state: {
  fileSystemWorker: DisposableMockRpc | undefined
  rendererWorker: DisposableMockRpc | undefined
} = {
  fileSystemWorker: undefined,
  rendererWorker: undefined,
}

afterEach(() => {
  state.fileSystemWorker?.[Symbol.dispose]()
  state.rendererWorker?.[Symbol.dispose]()
  state.fileSystemWorker = undefined
  state.rendererWorker = undefined
})

const registerRendererWorker = (): void => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'ExtensionManagement.invalidateExtensionsCache'() {},
    'WebView.compatSharedProcessInvoke'() {
      return 'file:///config/disabled-extensions.json'
    },
  })
}

const getRendererWorker = (): DisposableMockRpc => {
  if (!state.rendererWorker) {
    throw new Error('Missing renderer worker')
  }
  return state.rendererWorker
}

test('enableExtension2 returns when desktop disabled extensions file is missing', async () => {
  registerRendererWorker()
  state.fileSystemWorker = FileSystemWorker.registerMockRpc({
    'FileSystem.exists'() {
      return false
    },
  })

  await enableExtension2('sample.extension', PlatformType.Remote)

  expect(state.fileSystemWorker.invocations).toEqual([['FileSystem.exists', 'file:///config/disabled-extensions.json']])
})

test('enableExtension2 removes an id from the desktop disabled extensions file', async () => {
  registerRendererWorker()
  state.fileSystemWorker = FileSystemWorker.registerMockRpc({
    'FileSystem.exists'() {
      return true
    },
    'FileSystem.readFile'() {
      return JSON.stringify({ disabledExtensions: ['sample.extension', 'other.extension'] })
    },
    'FileSystem.writeFile'() {},
  })

  await enableExtension2('sample.extension', PlatformType.Electron)

  expect(state.fileSystemWorker.invocations).toEqual([
    ['FileSystem.exists', 'file:///config/disabled-extensions.json'],
    ['FileSystem.readFile', 'file:///config/disabled-extensions.json'],
    ['FileSystem.writeFile', 'file:///config/disabled-extensions.json', '{\n  "disabledExtensions": [\n    "other.extension"\n  ]\n}\n'],
  ])
  expect(getRendererWorker().invocations).toEqual([
    ['WebView.compatSharedProcessInvoke', 'PlatformPaths.getDisabledExtensionsJsonUri'],
    ['ExtensionManagement.invalidateExtensionsCache'],
  ])
})

test('enableExtension2 handles desktop data without disabled extensions', async () => {
  registerRendererWorker()
  state.fileSystemWorker = FileSystemWorker.registerMockRpc({
    'FileSystem.exists'() {
      return true
    },
    'FileSystem.readFile'() {
      return '{}'
    },
    'FileSystem.writeFile'() {},
  })

  await enableExtension2('sample.extension', PlatformType.Remote)

  expect(state.fileSystemWorker.invocations.at(-1)).toEqual([
    'FileSystem.writeFile',
    'file:///config/disabled-extensions.json',
    '{\n  "disabledExtensions": []\n}\n',
  ])
})
