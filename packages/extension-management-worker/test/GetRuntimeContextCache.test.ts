import { expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { getRuntimeContext } from '../src/parts/GetRuntimeContext/GetRuntimeContext.ts'

test('shares the fixed renderer asset directory across concurrent and later requests', async () => {
  using renderer = RendererWorker.registerMockRpc({ 'Layout.getAssetDir': () => '/assets' })
  expect(await Promise.all(Array.from({ length: 3 }, () => getRuntimeContext('', PlatformType.Electron)))).toEqual(
    Array.from({ length: 3 }, () => ({ assetDir: '/assets', platform: PlatformType.Electron })),
  )
  expect(await getRuntimeContext('', PlatformType.Electron)).toEqual({ assetDir: '/assets', platform: PlatformType.Electron })
  expect(await getRuntimeContext('/explicit', PlatformType.Electron)).toEqual({ assetDir: '/explicit', platform: PlatformType.Electron })
  expect(renderer.invocations).toEqual([['Layout.getAssetDir']])
})

test('a replacement renderer connection resolves its own asset directory', async () => {
  using first = RendererWorker.registerMockRpc({ 'Layout.getAssetDir': () => '/old' })
  expect(await getRuntimeContext('', PlatformType.Electron)).toMatchObject({ assetDir: '/old' })
  using second = RendererWorker.registerMockRpc({ 'Layout.getAssetDir': () => '/new' })
  expect(await getRuntimeContext('', PlatformType.Electron)).toMatchObject({ assetDir: '/new' })
  expect(first.invocations).toHaveLength(1)
  expect(second.invocations).toHaveLength(1)
})

test('retries a failed asset directory request', async () => {
  let failed = false
  using renderer = RendererWorker.registerMockRpc({
    'Layout.getAssetDir': () => {
      if (!failed) {
        failed = true
        throw new Error('not ready')
      }
      return '/assets'
    },
  })
  await expect(getRuntimeContext('', PlatformType.Electron)).rejects.toThrow('not ready')
  expect(await getRuntimeContext('', PlatformType.Electron)).toMatchObject({ assetDir: '/assets' })
  expect(renderer.invocations).toHaveLength(2)
})

test('does not retain an empty asset directory response', async () => {
  let ready = false
  using renderer = RendererWorker.registerMockRpc({ 'Layout.getAssetDir': () => (ready ? '/ready' : '') })
  expect(await getRuntimeContext('', PlatformType.Electron)).toMatchObject({ assetDir: '' })
  ready = true
  expect(await getRuntimeContext('', PlatformType.Electron)).toMatchObject({ assetDir: '/ready' })
  expect(renderer.invocations).toHaveLength(2)
})

test('application runtime queries do not share the default renderer cache', async () => {
  let assetDir = '/first'
  using renderer = RendererWorker.registerMockRpc({
    'Application.execute': () => assetDir,
    'Layout.getAssetDir': () => '/default',
  })
  expect(await getRuntimeContext('', PlatformType.Electron)).toMatchObject({ assetDir: '/default' })
  expect(await getRuntimeContext('', PlatformType.Electron, 'preview')).toMatchObject({ assetDir: '/first' })
  assetDir = '/second'
  expect(await getRuntimeContext('', PlatformType.Electron, 'preview')).toMatchObject({ assetDir: '/second' })
  expect(renderer.invocations).toEqual([
    ['Layout.getAssetDir'],
    ['Application.execute', 'preview', 'Layout.getAssetDir'],
    ['Application.execute', 'preview', 'Layout.getAssetDir'],
  ])
})
