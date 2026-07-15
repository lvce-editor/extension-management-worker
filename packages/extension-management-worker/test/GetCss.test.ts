import { expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { getCss } from '../src/parts/GetCss/GetCss.ts'

test('getCss resolves a contributed stylesheet path', () => {
  expect(getCss({ id: 'sample.extension', path: '/extensions/sample' }, { css: 'media/view.css' }, '', PlatformType.Remote)).toBe(
    'http://localhost/remote/extensions/sample/media/view.css',
  )
})

test('getCss returns an empty string when no stylesheet is contributed', () => {
  expect(getCss({}, undefined, '', PlatformType.Remote)).toBe('')
})
