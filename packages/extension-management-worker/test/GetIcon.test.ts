import { expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { getIcon } from '../src/parts/GetIcon/GetIcon.ts'

test('getIcon resolves a relative manifest icon', () => {
  expect(
    getIcon({ id: 'sample.extension', path: '/extensions/sample' }, { icon: 'media/icon.svg' }, { icon: 'symbol-files' }, '', PlatformType.Remote),
  ).toBe('http://localhost/remote/extensions/sample/media/icon.svg')
})

test('getIcon preserves symbolic manifest icons', () => {
  expect(getIcon({}, { icon: 'symbol-files' }, { icon: 'symbol-output' }, '', PlatformType.Remote)).toBe('symbol-files')
})

test('getIcon falls back to the registered icon', () => {
  expect(getIcon({}, undefined, { icon: 'symbol-output' }, '', PlatformType.Remote)).toBe('symbol-output')
})
