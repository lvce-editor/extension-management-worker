import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { handleViewContextChange } from '../src/parts/HandleViewContextChange/HandleViewContextChange.ts'

const state: {
  rendererWorker: DisposableMockRpc | undefined
} = {
  rendererWorker: undefined,
}

afterEach(() => {
  state.rendererWorker?.[Symbol.dispose]()
  state.rendererWorker = undefined
})

test('forwards view context changes to renderer worker', async () => {
  const invocations: unknown[] = []
  state.rendererWorker = RendererWorker.registerMockRpc({
    'ExtensionManagement.handleViewContextChange'(uid: number, viewId: string, context: Readonly<Record<string, boolean>>) {
      invocations.push([uid, viewId, context])
    },
  })

  await handleViewContextChange(1, 'sample.views.testing', {
    'sample.focus': true,
  })

  expect(invocations).toEqual([[1, 'sample.views.testing', { 'sample.focus': true }]])
})
