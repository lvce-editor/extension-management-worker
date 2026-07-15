import { expect, test } from '@jest/globals'
import { contributesViews } from '../src/parts/ContributesViews/ContributesViews.ts'

test('contributesViews returns true when the extension contributes a view', () => {
  expect(contributesViews({ views: [{ id: 'sample.views.files' }] })).toBe(true)
})

test('contributesViews returns false when the extension has no views', () => {
  expect(contributesViews({})).toBe(false)
  expect(contributesViews({ views: [] })).toBe(false)
})
