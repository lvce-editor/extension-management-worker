import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import * as Preferences from '../src/parts/Preferences/Preferences.ts'

const state: { rendererWorker: DisposableMockRpc | undefined } = {
  rendererWorker: undefined,
}

afterEach(() => {
  state.rendererWorker?.[Symbol.dispose]()
  state.rendererWorker = undefined
})

test('getPreference invokes renderer worker', async () => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'Preferences.get': async () => 16,
  })

  await expect(Preferences.getPreference('editor.fontSize')).resolves.toBe(16)

  expect(state.rendererWorker.invocations).toEqual([['Preferences.get', 'editor.fontSize']])
})

test('setPreference invokes renderer worker update', async () => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'Preferences.update': async () => undefined,
  })

  await Preferences.setPreference('editor.fontSize', 16)

  expect(state.rendererWorker.invocations).toEqual([['Preferences.update', { 'editor.fontSize': 16 }]])
})
