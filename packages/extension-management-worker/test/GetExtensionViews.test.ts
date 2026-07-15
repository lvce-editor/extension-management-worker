import { expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { getExtensionViews } from '../src/parts/GetExtensionViews/GetExtensionViews.ts'

test('getExtensionViews converts manifest views without starting an extension worker', () => {
  expect(
    getExtensionViews(
      {
        id: 'sample.extension',
        views: [{ id: 'sample.views.files', title: 'Manifest title' }],
      },
      '',
      PlatformType.Remote,
    ),
  ).toEqual([
    {
      extensionId: 'sample.extension',
      icon: '',
      id: 'sample.views.files',
      iframe: undefined,
      kind: '',
      showSideBarHeader: true,
      title: 'Manifest title',
    },
  ])
})

test('getExtensionViews ignores extensions without manifest views', () => {
  expect(getExtensionViews({ id: 'sample.extension' }, '', PlatformType.Remote)).toEqual([])
})

test('getExtensionViews ignores invalid manifest view ids', () => {
  expect(getExtensionViews({ id: 'sample.extension', views: [{ id: 1 as any }] }, '', PlatformType.Remote)).toEqual([])
})
