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
      displayName: 'Sample Files',
      extensionId: 'sample.extension',
      icon: 'symbol-files',
      id: 'sample.views.files',
      title: 'Sample Files',
    },
  ])
})

test('getViewsFromExtensions uses displayName and name fallbacks', () => {
  const extensions = [
    {
      id: 'sample.extension',
      views: [
        {
          displayName: 'Sample Display',
          id: 'sample.views.display',
          title: 'Sample Title',
        },
        {
          id: 'sample.views.name',
          name: 'Sample Name',
        },
        {
          id: 'sample.views.id',
        },
      ],
    },
  ]

  expect(getViewsFromExtensions(extensions)).toEqual([
    {
      displayName: 'Sample Display',
      extensionId: 'sample.extension',
      icon: '',
      id: 'sample.views.display',
      title: 'Sample Display',
    },
    {
      displayName: 'Sample Name',
      extensionId: 'sample.extension',
      icon: '',
      id: 'sample.views.name',
      title: 'Sample Name',
    },
    {
      displayName: 'sample.views.id',
      extensionId: 'sample.extension',
      icon: '',
      id: 'sample.views.id',
      title: 'sample.views.id',
    },
  ])
})

test('getViewsFromExtensions ignores invalid view ids', () => {
  const extensions = [
    {
      id: 'sample.extension',
      views: [
        {
          id: 1,
          title: 'Invalid',
        },
      ],
    },
  ]

  expect(getViewsFromExtensions(extensions)).toEqual([])
})
