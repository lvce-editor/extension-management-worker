import { expect, test } from '@jest/globals'
import { getManifestView } from '../src/parts/GetManifestView/GetManifestView.ts'

test('getManifestView returns the matching manifest view', () => {
  const view = {
    id: 'sample.views.files',
    title: 'Files',
  }
  expect(
    getManifestView(
      {
        views: [{ id: 'sample.views.output' }, view],
      },
      'sample.views.files',
    ),
  ).toBe(view)
})

test('getManifestView returns undefined when no view matches', () => {
  expect(getManifestView({}, 'sample.views.files')).toBeUndefined()
})
