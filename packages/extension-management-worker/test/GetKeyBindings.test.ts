import { afterEach, expect, test } from '@jest/globals'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import { getKeyBindings } from '../src/parts/GetKeyBindings/GetKeyBindings.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'

const state: {
  sharedProcess: DisposableMockRpc | undefined
} = {
  sharedProcess: undefined,
}

afterEach(() => {
  ExtensionsState.reset()
  state.sharedProcess?.[Symbol.dispose]()
  state.sharedProcess = undefined
})

test('returns valid extension keybinding contributions', async () => {
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [
        {
          id: 'sample.extension',
          keybindings: [
            {
              command: 'sample.run',
              key: 'Ctrl+Enter',
              when: 'sample.focus',
            },
            {
              command: 1,
              key: 'Escape',
            },
          ],
        },
      ]
    },
  })

  await expect(getKeyBindings('', 2)).resolves.toEqual([
    {
      command: 'sample.run',
      extensionId: 'sample.extension',
      key: 'Ctrl+Enter',
      when: 'sample.focus',
    },
  ])
})
