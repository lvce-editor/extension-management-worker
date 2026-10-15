import { expect, test } from '@jest/globals'
import { getColorThemeJsonCacheKey } from '../src/parts/GetColorThemeJsonCacheKey/GetColorThemeJsonCacheKey.ts'

test('color theme cache keys include the resolved source', () => {
  expect(getColorThemeJsonCacheKey('extensions/one/theme.json')).not.toBe(getColorThemeJsonCacheKey('extensions/two/theme.json'))
})
