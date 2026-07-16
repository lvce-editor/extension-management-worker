import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import { createColorThemeFromJson } from '../src/parts/CreateColorThemeFromJson/CreateColorThemeFromJson.ts'
import * as ExtensionHostRpcState from '../src/parts/ExtensionHostRpcState/ExtensionHostRpcState.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { getColorThemeCssCached } from '../src/parts/GetColorThemeCssCached/GetColorThemeCssCached.ts'
import { getColorThemeNamesFromExtensions } from '../src/parts/GetColorThemeNamesFromExtensions/GetColorThemeNamesFromExtensions.ts'
import { getColorThemeUri } from '../src/parts/GetColorThemePath/GetColorThemePath.ts'
import { getExtension } from '../src/parts/GetExtension/GetExtension.ts'
import { getRemoteUrl } from '../src/parts/GetRemoteUrl/GetRemoteUrl.ts'
import { getRemoteUrlForWebView } from '../src/parts/GetRemoteUrlForWebView/GetRemoteUrlForWebView.ts'
import { getRpcInfo } from '../src/parts/GetRpcInfo/GetRpcInfo.ts'
import { getRuntimeStatus } from '../src/parts/GetRuntimeStatus/GetRuntimeStatus.ts'
import { handleRpcInfos } from '../src/parts/HandleRpcInfos/HandleRpcInfos.ts'
import { tryToGetActualImportErrorMessage } from '../src/parts/TryToGetActualImportErrorMessage/TryToGetActualImportErrorMessage.ts'

const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch')
const state: { sharedProcess: DisposableMockRpc | undefined } = {
  sharedProcess: undefined,
}

beforeEach(() => {
  jest.restoreAllMocks()
  ExtensionsState.reset()
})

afterEach(() => {
  state.sharedProcess?.[Symbol.dispose]()
  state.sharedProcess = undefined
  if (originalFetch) {
    Object.defineProperty(globalThis, 'fetch', originalFetch)
  } else {
    delete (globalThis as any).fetch
  }
})

test('createColorThemeFromJson rejects invalid theme data', () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

  expect(createColorThemeFromJson('empty', undefined)).toBe('')
  expect(createColorThemeFromJson('string', 'invalid')).toBe('')
  expect(createColorThemeFromJson('array', [])).toBe('')
  expect(createColorThemeFromJson('missing-colors', {})).toBe('')
  expect(warnSpy).toHaveBeenCalledTimes(3)
})

test('createColorThemeFromJson adds fallback colors and token rules', () => {
  const result = createColorThemeFromJson('sample', {
    colors: {
      ActivityBarForeground: '#fff',
      VariableName: '#abc',
    },
    tokenColors: [{ foreground: '#123', name: 'keyword' }],
  })

  expect(result).toContain('--ActivityBarInactiveForeground: #fff;')
  expect(result).toContain('--CssVariableName: #abc;')
  expect(result).toContain('.keyword { color: #123 }')
  expect(result).not.toContain('border-left: 1px solid var(--ContrastBorder)')
})

test('createColorThemeFromJson preserves fallbacks and adds contrast rules', () => {
  const result = createColorThemeFromJson('sample', {
    colors: {
      ActivityBarInactiveForeground: '#aaa',
      ContrastBorder: '#fff',
      CssVariableName: '#bbb',
      VariableName: '#ccc',
    },
  })

  expect(result).toContain('--ActivityBarInactiveForeground: #aaa;')
  expect(result).toContain('--CssVariableName: #bbb;')
  expect(result).toContain('border-left: 1px solid var(--ContrastBorder)')
  expect(result).toContain('#QuickPick')
})

test('getColorThemeCssCached loads theme data when the noop cache is empty', async () => {
  const getData = jest.fn<(colorThemeId: string, platform: number) => Promise<string>>().mockResolvedValue('theme css')

  await expect(getColorThemeCssCached('sample', PlatformType.Web, getData)).resolves.toBe('theme css')
  expect(getData).toHaveBeenCalledWith('sample', PlatformType.Web)
})

test('getColorThemeUri finds matching contributed theme', () => {
  const extensions = [
    {},
    {
      colorThemes: [
        { id: 'other', path: 'themes/other.json' },
        { id: 'sample', path: 'themes/sample.json' },
      ],
      uri: 'extensions/theme',
    },
  ]

  expect(getColorThemeUri(extensions, 'sample')).toBe('extensions/theme/themes/sample.json')
  expect(getColorThemeUri(extensions, 'missing')).toBe('')
})

test('getRemoteUrl handles http, https, absolute, and relative urls', () => {
  // eslint-disable-next-line unicorn/prefer-https
  expect(getRemoteUrl('http://example.com/file')).toBe('http://example.com/file')
  expect(getRemoteUrl('https://example.com/file')).toBe('https://example.com/file')
  expect(getRemoteUrl('/extensions/file')).toBe('/remote/extensions/file')
  expect(getRemoteUrl('extensions/file')).toBe('/remote/extensions/file')
})

test('getRemoteUrlForWebView requires a registered webview', async () => {
  await expect(getRemoteUrlForWebView('/extensions/file')).rejects.toThrow('webview undefined not found')
})

test('getColorThemeNamesFromExtensions handles missing, enabled, and disabled contributions', async () => {
  await expect(
    getColorThemeNamesFromExtensions([
      {},
      {
        colorThemes: [{ id: 'dark' }, { id: 'light' }],
      },
      {
        colorThemes: [{ id: 'disabled-theme' }],
        disabled: true,
      },
    ]),
  ).resolves.toEqual(['dark', 'light'])
})

test('handleRpcInfos ignores invalid extension rpc contributions', () => {
  handleRpcInfos(undefined, PlatformType.Web)
  handleRpcInfos({}, PlatformType.Web)
  handleRpcInfos({ rpc: 'invalid' }, PlatformType.Web)

  expect(ExtensionHostRpcState.get('invalid-rpc')).toBeUndefined()
})

test('handleRpcInfos stores rpc contributions with absolute urls', () => {
  const rpc = { id: 'utility-branches-rpc', url: 'worker.js' }

  handleRpcInfos({ path: '/extensions/sample', rpc: [rpc] }, PlatformType.Web)

  expect(getRpcInfo('utility-branches-rpc')).toEqual({
    id: 'utility-branches-rpc',
    url: '/extensions/sample/worker.js',
  })
  expect(rpc.url).toBe('/extensions/sample/worker.js')
})

test('handleRpcInfos warns when a malformed contribution throws', () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  const extension = {
    get rpc(): unknown {
      throw new Error('malformed rpc')
    },
  }

  handleRpcInfos(extension, PlatformType.Web)

  expect(warnSpy).toHaveBeenCalledWith('Failed to handle extension rpcs: Error: malformed rpc')
})

test('getRpcInfo throws for unknown rpc', () => {
  expect(() => getRpcInfo('utility-branches-missing')).toThrow('Rpc not found utility-branches-missing')
})

test('getRuntimeStatus returns an empty status and then a stored status', () => {
  expect(getRuntimeStatus('sample.extension')).toEqual({
    activationEndTime: 0,
    activationEvent: '',
    activationStartTime: 0,
    activationTime: 0,
    id: '',
    importEndTime: 0,
    importStartTime: 0,
    importTime: 0,
    status: 0,
  })
  ExtensionsState.updateRuntimeStatus('sample.extension', { status: 1 })
  expect(getRuntimeStatus('sample.extension')).toEqual(expect.objectContaining({ id: 'sample.extension', status: 1 }))
})

test('getExtension returns matching extension or undefined', async () => {
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [{ id: 'one' }, { id: 'two' }]
    },
  })

  await expect(getExtension('two', '/assets', PlatformType.Electron)).resolves.toEqual({ id: 'two' })
  await expect(getExtension('missing', '/assets', PlatformType.Electron)).resolves.toBeUndefined()
})

test('tryToGetActualImportErrorMessage handles fetch failures', async () => {
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (): Promise<Response> => {
      throw new Error('offline')
    },
  })

  await expect(tryToGetActualImportErrorMessage('https://example.com/main.js', new Error('import failed'))).resolves.toBe(
    'Failed to import https://example.com/main.js: Error: offline',
  )
})

test('tryToGetActualImportErrorMessage handles successful, missing, and failed responses', async () => {
  const responses = [
    { ok: true, status: 200 },
    { ok: false, status: 404 },
    { ok: false, status: 500 },
  ]
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (): Promise<Response> => responses.shift() as Response,
  })
  const error = new Error('import failed')

  await expect(tryToGetActualImportErrorMessage('https://example.com/ok.js', error)).rejects.toThrow(
    'Failed to import https://example.com/ok.js: Unknown Error',
  )
  await expect(tryToGetActualImportErrorMessage('https://example.com/missing.js', error)).rejects.toThrow(
    'Failed to import https://example.com/missing.js: Not found (404)',
  )
  await expect(tryToGetActualImportErrorMessage('https://example.com/error.js', error)).resolves.toBe(
    'Failed to import https://example.com/error.js: Error: import failed',
  )
})
