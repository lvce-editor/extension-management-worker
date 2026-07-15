import { expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { getIframe } from '../src/parts/GetIframe/GetIframe.ts'

test('getIframe creates iframe metadata from a contributed iframe', () => {
  expect(
    getIframe(
      { id: 'sample.extension', path: '/extensions/sample' },
      {
        iframe: {
          credentialless: false,
          csp: "default-src 'self'",
          path: 'view.html',
          sandbox: ['allow-scripts', 1 as any],
        },
      },
      '',
      PlatformType.Remote,
    ),
  ).toEqual({
    credentialless: false,
    csp: "default-src 'self'",
    sandbox: ['allow-scripts'],
    src: 'http://localhost/remote/extensions/sample/view.html',
  })
})

test('getIframe returns undefined when no iframe path is contributed', () => {
  expect(getIframe({}, { iframe: {} }, '', PlatformType.Remote)).toBeUndefined()
})
