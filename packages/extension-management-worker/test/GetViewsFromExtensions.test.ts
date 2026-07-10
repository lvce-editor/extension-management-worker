import { expect, test } from '@jest/globals'
import { getViewsFromExtensions } from '../src/parts/GetViewsFromExtensions/GetViewsFromExtensions.ts'

test('getViewsFromExtensions returns contributed views', () => {
  const extensions = [
    {
      id: 'sample.extension',
      views: [
        {
          icon: 'symbol-files',
          id: 'sample.views.files',
          title: 'Sample Files',
        },
      ],
    },
    {
      id: 'sample.empty',
    },
  ]

  expect(getViewsFromExtensions(extensions)).toEqual([
    {
      extensionId: 'sample.extension',
      icon: 'symbol-files',
      id: 'sample.views.files',
      title: 'Sample Files',
    },
  ])
})

test('getViewsFromExtensions ignores invalid view ids', () => {
  const extensions = [
    undefined,
    {
      id: 'sample.extension',
      views: [
        undefined,
        {
          id: 1,
          title: 'Invalid',
        },
      ],
    },
  ]

  expect(getViewsFromExtensions(extensions)).toEqual([])
})

test('getViewsFromExtensions falls back to empty icon and id title', () => {
  expect(
    getViewsFromExtensions([
      {
        id: 'sample.extension',
        views: [{ id: 'sample.views.files' }],
      },
    ]),
  ).toEqual([
    {
      extensionId: 'sample.extension',
      icon: '',
      id: 'sample.views.files',
      title: 'sample.views.files',
    },
  ])
})
