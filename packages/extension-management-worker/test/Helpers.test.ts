import { expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { getExtensionAbsolutePath } from '../src/parts/GetExtensionAbsolutePath/GetExtensionAbsolutePath.ts'
import { getExtensionId } from '../src/parts/GetExtensionId/GetExtensionId.ts'
import { getLanguagesFromExtension } from '../src/parts/GetLanguagesFromExtension/GetLanguagesFromExtension.ts'
import { getUrlPrefix } from '../src/parts/GetUrlPrefix/GetUrlPrefix.ts'
import { isImportError } from '../src/parts/IsImportError/IsImportError.ts'
import { isImportErrorChrome } from '../src/parts/IsImportErrorChrome/IsImportErrorChrome.ts'
import { isImportErrorFirefox } from '../src/parts/IsImportErrorFirefox/IsImportErrorFirefox.ts'

test('isImportError detects browser import errors', () => {
  expect(isImportError(new Error('Failed to fetch dynamically imported module: https://example.com/main.js'))).toBe(true)
  expect(isImportError(new TypeError('error loading dynamically imported module'))).toBe(true)
  expect(isImportError(new SyntaxError('Unexpected token'))).toBe(true)
  expect(isImportError(new Error('Other error'))).toBe(false)
  expect(isImportError(undefined)).toBe(false)
})

test('isImportErrorChrome detects only matching chrome import errors', () => {
  expect(isImportErrorChrome(new Error('Failed to fetch dynamically imported module: https://example.com/main.js'))).toBe(true)
  expect(isImportErrorChrome(new Error('Other error'))).toBe(false)
  expect(isImportErrorChrome(undefined)).toBe(false)
})

test('isImportErrorFirefox detects only matching firefox import errors', () => {
  expect(isImportErrorFirefox(new TypeError('error loading dynamically imported module'))).toBe(true)
  expect(isImportErrorFirefox(new TypeError('Other error'))).toBe(false)
  expect(isImportErrorFirefox(undefined)).toBe(false)
})

test('getUrlPrefix returns remote-aware extension prefixes', () => {
  expect(getUrlPrefix(PlatformType.Electron, 'https://example.com/extension')).toBe('https://example.com/extension')
  expect(getUrlPrefix(PlatformType.Web, 'extensions/sample')).toBe('extensions/sample')
  expect(getUrlPrefix(PlatformType.Electron, '/extensions/sample')).toBe('/remote/extensions/sample')
  expect(getUrlPrefix(PlatformType.Electron, 'extensions/sample')).toBe('/remote/extensions/sample')
})

test('getLanguagesFromExtension preserves remote web extension tokenizer urls', () => {
  const extension = {
    id: 'sample.extension',
    languages: [
      {
        id: 'mock',
        tokenize: 'src/tokenizeMock.js',
      },
    ],
    path: 'https://example.com/extension',
  }

  expect(getLanguagesFromExtension(extension, PlatformType.Electron)).toEqual([
    {
      extensionPath: 'https://example.com/extension',
      id: 'mock',
      tokenize: 'https://example.com/extension/src/tokenizeMock.js',
    },
  ])
})

test('getLanguagesFromExtension handles missing and malformed language contributions', () => {
  expect(getLanguagesFromExtension(undefined, PlatformType.Web)).toEqual([])
  expect(getLanguagesFromExtension({}, PlatformType.Web)).toEqual([])
  expect(
    getLanguagesFromExtension(
      {
        languages: [{ id: 'plain' }],
        path: '/extensions/sample',
      },
      PlatformType.Web,
    ),
  ).toEqual([{ id: 'plain' }])
})

test('getLanguagesFromExtension rejects non-string tokenizer paths', () => {
  const { warn } = console
  const warnings: string[] = []
  console.warn = (message: string): void => {
    warnings.push(message)
  }
  try {
    expect(
      getLanguagesFromExtension(
        {
          languages: [{ id: 'mock', tokenize: true }],
          path: '/extensions/sample',
        },
        PlatformType.Web,
      ),
    ).toEqual([
      {
        extensionPath: '/extensions/sample',
        id: 'mock',
        tokenize: '',
      },
    ])
    expect(warnings).toEqual(['[info] mock: language.tokenize must be of type string but was of type boolean'])
  } finally {
    console.warn = warn
  }
})

test('getLanguagesFromExtension resolves web tokenizer paths without a remote prefix', () => {
  expect(
    getLanguagesFromExtension(
      {
        languages: [{ id: 'mock', tokenize: 'tokenize.js' }],
        path: '/extensions/sample',
      },
      PlatformType.Web,
    ),
  ).toEqual([
    {
      extensionPath: '/extensions/sample',
      id: 'mock',
      tokenize: '/extensions/sample/tokenize.js',
    },
  ])
})

test('getExtensionId infers ids from extension metadata', () => {
  expect(getExtensionId({ id: 'sample.extension', path: '/extensions/other' })).toBe('sample.extension')
  expect(getExtensionId({ path: '/extensions/sample.extension' })).toBe('sample.extension')
  expect(getExtensionId(undefined)).toBe('<unknown>')
})

test('getExtensionAbsolutePath resolves extension resource paths', () => {
  expect(
    getExtensionAbsolutePath('sample.extension', false, false, 'https://example.com/extension', 'main.js', 'https://origin.test', 0, '/assets'),
  ).toBe('https://example.com/extension/main.js')
  expect(
    getExtensionAbsolutePath('sample.extension', false, false, 'https://example.com/extension/', 'main.js', 'https://origin.test', 0, '/assets'),
  ).toBe('https://example.com/extension/main.js')
  expect(getExtensionAbsolutePath('sample.extension', true, false, 'extensions/sample', 'main.js', 'https://origin.test', 0, '/assets')).toBe(
    '/extensions/sample/main.js',
  )
  expect(
    getExtensionAbsolutePath('sample.extension', false, false, 'extensions/sample', 'main.js', 'https://origin.test', PlatformType.Web, '/assets'),
  ).toBe('/extensions/sample/main.js')
  expect(getExtensionAbsolutePath('sample.extension', false, true, '/extensions/sample', 'main.js', 'https://origin.test', 0, '/assets')).toBe(
    '/assets/extensions/sample.extension/main.js',
  )
  expect(getExtensionAbsolutePath('sample.extension', false, false, '/extensions/sample', 'main.js', 'https://origin.test', 0, '/assets')).toBe(
    'https://origin.test/remote/extensions/sample/main.js',
  )
})
