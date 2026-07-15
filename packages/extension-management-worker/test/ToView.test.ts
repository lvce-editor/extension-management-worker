import { expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { toView } from '../src/parts/ToView/ToView.ts'

test('toView combines manifest and registered view metadata', () => {
  const eventListeners = [
    {
      name: 'handleClick',
      params: ['event'],
    },
  ]
  expect(
    toView(
      {
        id: 'sample.extension',
        path: '/extensions/sample',
        views: [
          {
            css: 'media/view.css',
            icon: 'symbol-files',
            id: 'sample.views.files',
            kind: 'tree',
            selector: ['.txt', 1 as any],
            showSideBarHeader: false,
            title: 'Manifest title',
            type: 'preview',
          },
        ],
      },
      {
        eventListeners,
        id: 'sample.views.files',
        kind: 'virtualDom',
        title: 'Registered title',
      },
      '',
      PlatformType.Remote,
    ),
  ).toEqual({
    css: 'http://localhost/remote/extensions/sample/media/view.css',
    eventListeners,
    extensionId: 'sample.extension',
    icon: 'symbol-files',
    id: 'sample.views.files',
    iframe: undefined,
    kind: 'virtualDom',
    selector: ['.txt'],
    showSideBarHeader: false,
    title: 'Registered title',
    type: 'preview',
  })
})
