import type { Rpc } from '@lvce-editor/rpc'
import { afterEach, expect, jest, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as GetIsolatedExtensionHostWorkerRpc from '../src/parts/GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'
import * as RuntimeStatusType from '../src/parts/RuntimeStatusType/RuntimeStatusType.ts'

const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')

afterEach(() => {
  ExtensionsState.reset()
  IsolatedExtensionHostWorkerState.clear()
  if (originalLocation) {
    Object.defineProperty(globalThis, 'location', originalLocation)
  } else {
    delete (globalThis as any).location
  }
})

const createRpc = (): Rpc => ({
  dispose: async () => {},
  invoke: async () => undefined,
  invokeAndTransfer: async () => undefined,
  send: () => {},
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
  ).toBe('/assets/extensions/source/main.js')
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
  const rpc = createRpc()
  IsolatedExtensionHostWorkerState.set('sample.extension', rpc)

  await expect(
    GetIsolatedExtensionHostWorkerRpc.getRpc({ id: 'sample.extension', workerName: 'Sample' }, '/assets', PlatformType.Remote),
  ).resolves.toBe(rpc)
})

test('getRpc records and announces a provider-launched extension worker', async () => {
  const rpc = createRpc()
  const getOrCreate = jest
    .fn<(extensionId: string, absolutePath: string, workerName?: string, contentSecurityPolicy?: string) => Promise<Rpc>>()
    .mockResolvedValue(rpc)
  const notify = jest.fn()

  await expect(
    GetIsolatedExtensionHostWorkerRpc.getRpc(
      { browser: 'dist/eslintMain.js', id: 'builtin.eslint', workerName: 'ESLint Worker' },
      '/assets',
      PlatformType.Electron,
      'onDiagnostic:javascript',
      getOrCreate,
      notify,
    ),
  ).resolves.toBe(rpc)

  expect(ExtensionsState.getRuntimeStatus('builtin.eslint')).toEqual(
    expect.objectContaining({
      activationEvent: 'onDiagnostic:javascript',
      id: 'builtin.eslint',
      status: RuntimeStatusType.Activated,
    }),
  )
  expect(notify).toHaveBeenCalledTimes(1)
})

test('getRpc records provider worker activation errors without announcing a running extension', async () => {
  const error = new Error('Failed to launch ESLint worker')
  const getOrCreate = jest
    .fn<(extensionId: string, absolutePath: string, workerName?: string, contentSecurityPolicy?: string) => Promise<Rpc>>()
    .mockRejectedValue(error)
  const notify = jest.fn()

  await expect(
    GetIsolatedExtensionHostWorkerRpc.getRpc(
      { browser: 'dist/eslintMain.js', id: 'builtin.eslint', workerName: 'ESLint Worker' },
      '/assets',
      PlatformType.Electron,
      'onDiagnostic:javascript',
      getOrCreate,
      notify,
    ),
  ).rejects.toBe(error)

  expect(ExtensionsState.getRuntimeStatus('builtin.eslint')).toEqual(
    expect.objectContaining({
      activationEvent: 'onDiagnostic:javascript',
      error: 'Failed to launch ESLint worker',
      id: 'builtin.eslint',
      status: RuntimeStatusType.Error,
    }),
  )
  expect(notify).not.toHaveBeenCalled()
})

test.each([
  '/usr/lib/lvce/resources/app/static/2d0c8e6/extensions/builtin.pull-request-github',
  '/usr/lib/lvce/resources/app/static/2d0c8e6/extensions/builtin.pull-request-github/',
  'C:\\Program Files\\LVCE\\resources\\app\\static\\2d0c8e6\\extensions\\builtin.pull-request-github',
])('getRpc launches the bundled GitHub worker from its directory: %s', async (path) => {
  const rpc = createRpc()
  const getOrCreate = jest
    .fn<(extensionId: string, absolutePath: string, workerName?: string, contentSecurityPolicy?: string) => Promise<Rpc>>()
    .mockResolvedValue(rpc)
  await GetIsolatedExtensionHostWorkerRpc.getRpc(
    {
      browser: 'dist/pullRequestWorkerMain.js',
      builtin: true,
      id: 'github.pull-requests',
      path,
    },
    '/2d0c8e6',
    PlatformType.Electron,
    'onView:github.pullRequests',
    getOrCreate,
    jest.fn(),
  )
  expect(getOrCreate.mock.calls[0]?.[1]).toBe('/2d0c8e6/extensions/builtin.pull-request-github/dist/pullRequestWorkerMain.js')
})

test('getAbsolutePath falls back to the builtin id when the directory is omitted', () => {
  expect(
    GetIsolatedExtensionHostWorkerRpc.getAbsolutePath({ browser: 'main.js', builtin: true, id: 'builtin.sample' }, '/assets', PlatformType.Electron),
  ).toBe('/assets/extensions/builtin.sample/main.js')
})
