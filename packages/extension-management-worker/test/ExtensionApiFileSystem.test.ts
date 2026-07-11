import { expect, test } from '@jest/globals'
import { FileSystemWorker } from '@lvce-editor/rpc-registry'
import { commandMap } from '../src/parts/CommandMap/CommandMap.ts'

test('reads a file for an isolated extension', async () => {
  const fileSystemWorker = FileSystemWorker.registerMockRpc({
    'FileSystem.readFile'(uri: string) {
      expect(uri).toBe('memfs:///workspace/package.json')
      return '{"name":"sample"}'
    },
  })

  try {
    await expect(commandMap['ExtensionApi.readFile']('memfs:///workspace/package.json')).resolves.toBe('{"name":"sample"}')
  } finally {
    fileSystemWorker[Symbol.dispose]()
  }
})
