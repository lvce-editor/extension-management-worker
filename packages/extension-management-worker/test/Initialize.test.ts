import { expect, jest, test } from '@jest/globals'
import { initialize } from '../src/parts/Initialize/Initialize.ts'

const createDependencies = () => ({
  configureHotReload: jest.fn((_extensions: readonly { readonly path: string; readonly uri: string }[]) => {}),
  initializeSharedProcess: jest.fn(async (_platform: number) => {}),
  invokeRenderer: jest.fn(async (_method: string, ..._params: readonly unknown[]) => undefined),
})

test('initialize - asks the renderer file-watcher adapter to watch linked extensions when enabled', async () => {
  const extensions = [{ path: '/extension', uri: 'file:///extension' }]
  const dependencies = createDependencies()

  await initialize(2, { extensions, hotReload: true }, dependencies)

  expect(dependencies.initializeSharedProcess).toHaveBeenCalledWith(2)
  expect(dependencies.configureHotReload).toHaveBeenCalledWith(extensions)
  expect(dependencies.invokeRenderer).toHaveBeenCalledWith('ExtensionHotReload.watch', extensions)
})

test('initialize - does not start a linked extension watcher unless hot reload is enabled', async () => {
  const dependencies = createDependencies()

  await initialize(
    2,
    {
      extensions: [{ path: '/extension', uri: 'file:///extension' }],
      hotReload: false,
    },
    dependencies,
  )

  expect(dependencies.invokeRenderer).not.toHaveBeenCalled()
})
