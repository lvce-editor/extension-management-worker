import { expect, jest, test } from '@jest/globals'
import { getViewsFromExtensions } from '../src/parts/GetViewsFromExtensions/GetViewsFromExtensions.ts'

test('getViewsFromExtensions returns contributed views from isolated extension manifests', () => {
  expect(
    getViewsFromExtensions(
      [
        {
          id: 'sample.extension',
          isolated: true,
          views: [{ icon: 'symbol-files', id: 'sample.views.files', title: 'Sample Files' }],
        },
        {
          id: 'sample.empty',
          isolated: true,
        },
      ],
      '',
      0,
    ),
  ).toEqual([
    {
      extensionId: 'sample.extension',
      icon: 'symbol-files',
      id: 'sample.views.files',
      iframe: undefined,
      kind: '',
      showSideBarHeader: true,
      title: 'Sample Files',
    },
  ])
})

test('getViewsFromExtensions warns and ignores non-isolated view contributions', () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

  expect(
    getViewsFromExtensions(
      [
        {
          id: 'sample.extension',
          isolated: false,
          views: [{ id: 'sample.views.files' }],
        },
      ],
      '',
      0,
    ),
  ).toEqual([])
  expect(warnSpy).toHaveBeenCalledWith(
    'Extension "sample.extension" contributes activity bar views but is not isolated. The views will not be shown. Add "isolated": true to extension.json to enable them.',
  )
})
