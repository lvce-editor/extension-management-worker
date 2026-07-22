import { expect, test } from '@jest/globals'
import { getContentSecurityPolicy } from '../src/parts/GetContentSecurityPolicy/GetContentSecurityPolicy.ts'

test('returns an empty policy when the manifest does not declare one', () => {
  expect(getContentSecurityPolicy(undefined)).toBe('')
})

test('formats manifest directives as a content security policy header', () => {
  expect(getContentSecurityPolicy([`default-src 'none'`, `connect-src https://nodejs.org`, `script-src 'self';`])).toBe(
    `default-src 'none'; connect-src https://nodejs.org; script-src 'self';`,
  )
})
