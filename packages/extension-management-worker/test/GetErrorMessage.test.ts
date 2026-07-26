import { expect, test } from '@jest/globals'
import { getErrorMessage } from '../src/parts/GetErrorMessage/GetErrorMessage.ts'

test('returns an Error message', () => {
  expect(getErrorMessage(new TypeError('Activation failed'))).toBe('Activation failed')
})

test('converts non-error values to strings', () => {
  expect(getErrorMessage('Activation failed')).toBe('Activation failed')
})
