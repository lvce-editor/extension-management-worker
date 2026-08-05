import { expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { getLanguageServerRootUri } from '../src/parts/GetLanguageServerRootUri/GetLanguageServerRootUri.ts'

test('getLanguageServerRootUri returns the current workspace path', async () => {
  const rendererWorker = RendererWorker.registerMockRpc({
    'Workspace.getPath'() {
      return 'file:///workspace'
    },
  })

  await expect(getLanguageServerRootUri()).resolves.toBe('file:///workspace')

  rendererWorker[Symbol.dispose]()
})

test('getLanguageServerRootUri tolerates an unavailable workspace', async () => {
  await expect(getLanguageServerRootUri()).resolves.toBeUndefined()
})
