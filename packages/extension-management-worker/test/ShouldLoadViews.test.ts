import { afterEach, expect, jest, test } from '@jest/globals'
import { shouldLoadViews } from '../src/parts/ShouldLoadViews/ShouldLoadViews.ts'

afterEach(() => {
  jest.restoreAllMocks()
})

test('shouldLoadViews returns true for isolated extensions that contribute views', () => {
  expect(
    shouldLoadViews({
      isolated: true,
      views: [{ id: 'sample.views.files' }],
    }),
  ).toBe(true)
})

test('shouldLoadViews returns false without warning when no views are contributed', () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

  expect(shouldLoadViews({ isolated: false })).toBe(false)
  expect(warnSpy).not.toHaveBeenCalled()
})

test('shouldLoadViews warns and returns false for non-isolated view contributions', () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

  expect(
    shouldLoadViews({
      id: 'sample.extension',
      isolated: false,
      views: [{ id: 'sample.views.files' }],
    }),
  ).toBe(false)
  expect(warnSpy).toHaveBeenCalledWith(
    'Extension "sample.extension" contributes activity bar views but is not isolated. The views will not be shown. Add "isolated": true to extension.json to enable them.',
  )
})
