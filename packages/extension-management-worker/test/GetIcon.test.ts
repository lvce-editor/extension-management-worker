import { expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { getIcon } from '../src/parts/GetIcon/GetIcon.ts'

test('getIcon resolves a relative manifest icon', () => {
  expect(getIcon({ id: 'sample.extension', path: '/extensions/sample' }, { icon: 'media/icon.svg' }, '', PlatformType.Remote)).toBe(
    'http://localhost/remote/extensions/sample/media/icon.svg',
  )
})

test('getIcon shortens relative icons for builtin file extensions', () => {
  expect(
    getIcon(
      { builtin: true, id: 'sample.extension', path: 'file:///app/resources/extensions/sample-extension' },
      { icon: 'media/icons/icon.svg' },
      '/assets',
      PlatformType.Electron,
    ),
  ).toBe('/assets/extensions/sample-extension/media/icons/icon.svg')
})

test('getIcon shortens absolute builtin icons contained in the extension directory', () => {
  expect(
    getIcon(
      { builtin: true, id: 'sample.extension', path: 'file:///app/resources/extensions/sample-extension' },
      { icon: '/app/resources/extensions/sample-extension/media/icon.svg' },
      '/assets',
      PlatformType.Electron,
    ),
  ).toBe('/assets/extensions/sample-extension/media/icon.svg')
})

test('getIcon shortens builtin file urls and Windows file paths', () => {
  expect(
    getIcon(
      { builtin: true, id: 'sample.extension', uri: 'file:///app/resources/extensions/sample-extension' },
      { icon: 'file:///app/resources/extensions/sample-extension/media/icon.svg' },
      '/assets',
      PlatformType.Electron,
    ),
  ).toBe('/assets/extensions/sample-extension/media/icon.svg')
  expect(
    getIcon(
      { builtin: true, id: 'sample.extension', path: 'file:///C:/Program%20Files/LVCE/extensions/sample' },
      { icon: 'file:///C:/Program%20Files/LVCE/extensions/sample/media/icon.svg' },
      '/assets',
      PlatformType.Electron,
    ),
  ).toBe('/assets/extensions/sample/media/icon.svg')
})

test('getIcon preserves builtin sibling paths, external urls, and user-installed icons', () => {
  const builtin = { builtin: true, id: 'sample.extension', path: 'file:///app/resources/extensions/sample' }
  expect(getIcon(builtin, { icon: '/app/resources/extensions/sample-sibling/icon.svg' }, '/assets', PlatformType.Electron)).toBe(
    '/app/resources/extensions/sample-sibling/icon.svg',
  )
  expect(getIcon(builtin, { icon: 'https://example.com/icon.svg' }, '/assets', PlatformType.Electron)).toBe('https://example.com/icon.svg')
  expect(
    getIcon(
      { id: 'sample.extension', path: 'file:///app/resources/extensions/sample' },
      { icon: 'media/icon.svg' },
      '/assets',
      PlatformType.Electron,
    ),
  ).toBe('http://localhost/remote/app/resources/extensions/sample/media/icon.svg')
  expect(getIcon(builtin, { icon: '../sibling/icon.svg' }, '/assets', PlatformType.Electron)).toContain(
    '/remote/app/resources/extensions/sibling/icon.svg',
  )
  expect(
    getIcon(
      { builtin: true, id: 'sample.extension', isWeb: true, path: 'file:///app/resources/extensions/sample' },
      { icon: 'media/icon.svg' },
      '/assets',
      PlatformType.Electron,
    ),
  ).toBe('http://localhost/remote/app/resources/extensions/sample/media/icon.svg')
})

test('getIcon preserves builtin file paths on the web platform', () => {
  expect(
    getIcon(
      { builtin: true, id: 'sample.extension', path: 'file:///app/resources/extensions/sample' },
      { icon: 'media/icon.svg' },
      '/assets',
      PlatformType.Web,
    ),
  ).toBe('http://localhost/remote/app/resources/extensions/sample/media/icon.svg')
})

test('getIcon preserves symbolic manifest icons', () => {
  expect(getIcon({}, { icon: 'symbol-files' }, '', PlatformType.Remote)).toBe('symbol-files')
})

test('getIcon returns an empty string when the manifest icon is missing', () => {
  expect(getIcon({}, undefined, '', PlatformType.Remote)).toBe('')
})
