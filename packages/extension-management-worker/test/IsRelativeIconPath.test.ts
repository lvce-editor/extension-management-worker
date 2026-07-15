import { expect, test } from '@jest/globals'
import { isRelativeIconPath } from '../src/parts/IsRelativeIconPath/IsRelativeIconPath.ts'

test('isRelativeIconPath detects relative image paths', () => {
  expect(isRelativeIconPath('./icon.svg')).toBe(true)
  expect(isRelativeIconPath('../icons/icon')).toBe(true)
  expect(isRelativeIconPath('icons/icon')).toBe(true)
  expect(isRelativeIconPath('icon.PNG')).toBe(true)
})

test('isRelativeIconPath rejects symbolic icons', () => {
  expect(isRelativeIconPath('symbol-files')).toBe(false)
})
