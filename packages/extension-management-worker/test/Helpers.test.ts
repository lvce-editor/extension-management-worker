import { expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { getExtensionAbsolutePath } from '../src/parts/GetExtensionAbsolutePath/GetExtensionAbsolutePath.ts'
import { getExtensionId } from '../src/parts/GetExtensionId/GetExtensionId.ts'
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
