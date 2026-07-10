import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, jest, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { FileSystemWorker, RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { getColorThemeJson } from '../src/parts/GetColorThemeJson/GetColorThemeJson.ts'
import { getColorThemeJson as getColorThemeJsonRemote } from '../src/parts/GetColorThemeJsonRemote/GetColorThemeJsonRemote.ts'

const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch')
const state: {
  fileSystemWorker: DisposableMockRpc | undefined
  rendererWorker: DisposableMockRpc | undefined
  sharedProcess: DisposableMockRpc | undefined
} = {
  fileSystemWorker: undefined,
  rendererWorker: undefined,
  sharedProcess: undefined,
}

afterEach(() => {
  jest.restoreAllMocks()
  ExtensionsState.reset()
  state.fileSystemWorker?.[Symbol.dispose]()
  state.rendererWorker?.[Symbol.dispose]()
  state.sharedProcess?.[Symbol.dispose]()
  state.fileSystemWorker = undefined
  state.rendererWorker = undefined
  state.sharedProcess = undefined
  if (originalFetch) {
    Object.defineProperty(globalThis, 'fetch', originalFetch)
  } else {
    delete (globalThis as any).fetch
  }
})

test('getColorThemeJson loads web themes from the asset directory', async () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    json: async () => ({ colors: { EditorBackground: '#000' } }),
    ok: true,
  } as Response)

  await expect(getColorThemeJson('dark', PlatformType.Web, '/assets')).resolves.toEqual({ colors: { EditorBackground: '#000' } })
  expect(fetchSpy).toHaveBeenCalledWith('/assets/extensions/builtin.theme-dark/color-theme.json')
})

test('getColorThemeJson remote returns an empty object when no theme matches', async () => {
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return []
    },
  })

  await expect(getColorThemeJson('missing', PlatformType.Remote, '/assets')).resolves.toEqual({})
})

test('getColorThemeJsonRemote reads a matching contributed theme', async () => {
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [
        {
          colorThemes: [{ id: 'sample', path: 'themes/sample.json' }],
          id: 'sample.theme',
          uri: 'extensions/sample.theme',
        },
      ]
    },
  })
  state.rendererWorker = RendererWorker.registerMockRpc({
    'FileSystem.readJson'() {
      return { colors: { EditorBackground: '#123' } }
    },
    'Workspace.getPath'() {
      return 'memfs:///workspace'
    },
  })
  state.fileSystemWorker = FileSystemWorker.registerMockRpc({
    'FileSystem.exists'() {
      return false
    },
  })

  await expect(getColorThemeJsonRemote('sample', '/assets', PlatformType.Remote)).resolves.toEqual({ colors: { EditorBackground: '#123' } })
  expect(state.rendererWorker.invocations).toContainEqual(['FileSystem.readJson', 'extensions/sample.theme/themes/sample.json'])
})
