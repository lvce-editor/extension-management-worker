import { expect, test } from '@jest/globals'
import { isAbsoluteIcon } from '../src/parts/IsAbsoluteIcon/IsAbsoluteIcon.ts'

test('isAbsoluteIcon detects absolute icon paths', () => {
  expect(isAbsoluteIcon('https://example.com/icon.svg')).toBe(true)
  expect(isAbsoluteIcon('file:///tmp/icon.svg')).toBe(true)
  expect(isAbsoluteIcon('/icons/icon.svg')).toBe(true)
})

test('isAbsoluteIcon rejects relative and symbolic icons', () => {
  expect(isAbsoluteIcon('./icon.svg')).toBe(false)
  expect(isAbsoluteIcon('symbol-files')).toBe(false)
})
