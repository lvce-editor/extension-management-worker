import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { commandMap } from '../src/parts/CommandMap/CommandMap.ts'
import { readFile } from '../src/parts/ReadFile/ReadFile.ts'

let rendererWorker: DisposableMockRpc | undefined

afterEach(() => {
  rendererWorker?.[Symbol.dispose]()
  rendererWorker = undefined
})

test('readFile reads through the renderer file system', async () => {
  rendererWorker = RendererWorker.registerMockRpc({
    'FileSystem.readFile': async (uri: string): Promise<string> => {
      return `content:${uri}`
    },
  })

  await expect(readFile('memfs:///workspace/.prettierignore')).resolves.toBe('content:memfs:///workspace/.prettierignore')

  expect(rendererWorker.invocations).toEqual([['FileSystem.readFile', 'memfs:///workspace/.prettierignore']])
})

test('commandMap exposes extension api readFile', () => {
  expect(commandMap['ExtensionApi.readFile']).toBe(readFile)
})
