import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import { enableExtension2 } from '../src/parts/EnableExtension2/EnableExtension2.ts'

const state: {
  rendererWorker: DisposableMockRpc | undefined
  sharedProcess: DisposableMockRpc | undefined
} = {
  rendererWorker: undefined,
  sharedProcess: undefined,
}

afterEach(() => {
  state.rendererWorker?.[Symbol.dispose]()
  state.sharedProcess?.[Symbol.dispose]()
  state.rendererWorker = undefined
  state.sharedProcess = undefined
})

const registerRendererWorker = (): void => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'ExtensionManagement.handleExtensionsCacheInvalidated'() {},
    'Workspace.getUri'() {
      return ''
    },
  })
}

const getRendererWorker = (): DisposableMockRpc => {
  if (!state.rendererWorker) {
    throw new Error('Missing renderer worker')
  }
  return state.rendererWorker
}

test('enableExtension2 delegates desktop enabling to the shared process', async () => {
  registerRendererWorker()
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.enable'() {},
  })

  await enableExtension2('sample.extension', PlatformType.Remote)

  expect(state.sharedProcess.invocations).toEqual([['ExtensionManagement.enable', 'sample.extension']])
  expect(getRendererWorker().invocations).toEqual([
    ['Workspace.getUri'],
    ['ExtensionManagement.handleExtensionsCacheInvalidated', 'sample.extension', false],
  ])
})
