import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { commandMap } from '../src/parts/CommandMap/CommandMap.ts'
import { readFile } from '../src/parts/ReadFile/ReadFile.ts'

const state: { rendererWorker: DisposableMockRpc | undefined } = {
  rendererWorker: undefined,
}

afterEach(() => {
  state.rendererWorker?.[Symbol.dispose]()
  state.rendererWorker = undefined
})

test('readFile reads through the renderer file system', async () => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'FileSystem.readFile': async (uri: string): Promise<string> => {
      return `content:${uri}`
    },
  })

  await expect(readFile('memfs:///workspace/.prettierignore')).resolves.toBe('content:memfs:///workspace/.prettierignore')

  expect(state.rendererWorker.invocations).toEqual([['FileSystem.readFile', 'memfs:///workspace/.prettierignore']])
})

test('commandMap exposes extension api readFile', () => {
  expect(commandMap['ExtensionApi.readFile']).toBe(readFile)
})
