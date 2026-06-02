import { test, expect } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import * as GetIsolatedExtensionHostWorkerRpc from '../src/parts/GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'

test('getAbsolutePath prefers extension path over file uri', () => {
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: {
      origin: 'http://localhost:3002',
    },
  })

  const actual = GetIsolatedExtensionHostWorkerRpc.getAbsolutePath(
    {
      browser: 'dist/prettierMain.js',
      id: 'builtin.prettier',
      path: '/test/prettier/packages/extension',
      uri: 'file:///test/prettier/packages/extension',
    },
    '',
    PlatformType.Remote,
  )

  expect(actual).toBe('http://localhost:3002/remote/test/prettier/packages/extension/dist/prettierMain.js')
})
