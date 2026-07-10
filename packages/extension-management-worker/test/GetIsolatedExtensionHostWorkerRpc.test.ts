import type { Rpc } from '@lvce-editor/rpc'
import { afterEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import * as GetIsolatedExtensionHostWorkerRpc from '../src/parts/GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')

afterEach(() => {
  IsolatedExtensionHostWorkerState.clear()
  if (originalLocation) {
    Object.defineProperty(globalThis, 'location', originalLocation)
  } else {
    delete (globalThis as any).location
  }
})

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

test('getExtensionId prefers id and infers from uri or path', () => {
  expect(GetIsolatedExtensionHostWorkerRpc.getExtensionId({ id: 'explicit', path: '/extensions/path' })).toBe('explicit')
  expect(GetIsolatedExtensionHostWorkerRpc.getExtensionId({ uri: '/extensions/from-uri' })).toBe('from-uri')
  expect(GetIsolatedExtensionHostWorkerRpc.getExtensionId({ path: '/extensions/from-path' })).toBe('from-path')
  expect(GetIsolatedExtensionHostWorkerRpc.getExtensionId({})).toBe('')
})

test('getAbsolutePath supports builtin and web manifests with omitted entrypoints', () => {
  expect(
    GetIsolatedExtensionHostWorkerRpc.getAbsolutePath(
      {
        browser: 'main.js',
        builtin: true,
        id: 'builtin.sample',
        path: '/extensions/source',
      },
      '/assets',
      PlatformType.Electron,
    ),
  ).toBe('/assets/extensions/builtin.sample/main.js')
  expect(
    GetIsolatedExtensionHostWorkerRpc.getAbsolutePath(
      {
        id: 'web.sample',
        isWeb: true,
        uri: '/extensions/web.sample',
      },
      '/assets',
      PlatformType.Electron,
    ),
  ).toBe('/extensions/web.sample/')
})

test('getAbsolutePath uses localhost when location and manifest paths are absent', () => {
  delete (globalThis as any).location

  expect(GetIsolatedExtensionHostWorkerRpc.getAbsolutePath({}, '', PlatformType.Remote)).toBe('http://localhost/remote//')
})

test('getRpc returns an existing isolated extension host rpc', async () => {
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async () => undefined,
    invokeAndTransfer: async () => undefined,
    send: () => {},
  }
  IsolatedExtensionHostWorkerState.set('sample.extension', rpc)

  await expect(
    GetIsolatedExtensionHostWorkerRpc.getRpc({ id: 'sample.extension', workerName: 'Sample' }, '/assets', PlatformType.Remote),
  ).resolves.toBe(rpc)
})
