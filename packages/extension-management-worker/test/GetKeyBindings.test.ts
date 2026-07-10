import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { getKeyBindings } from '../src/parts/GetKeyBindings/GetKeyBindings.ts'

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

  await expect(getKeyBindings('/assets', 2)).resolves.toEqual([
    {
      command: 'sample.run',
      extensionId: 'sample.extension',
      key: 'Ctrl+Enter',
      when: 'sample.focus',
    },
  ])
})

test('filters malformed keybindings and preserves valid optional fields', async () => {
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [
        {},
        {
          keybindings: 'invalid',
        },
        {
          keybindings: [
            { command: 'missing.key' },
            { command: 'invalid.when', key: 'A', when: 1 },
            { args: 'invalid', command: 'invalid.args', key: 'B' },
            { args: [], command: 'sample.empty', key: 'C', when: '' },
            { args: ['value'], command: 'sample.args', key: 'D', when: 'editorFocus' },
          ],
          uri: '/extensions/sample.extension',
        },
        {
          keybindings: [{ command: 'anonymous.run', key: 'E' }],
        },
      ]
    },
  })

  await expect(getKeyBindings('/assets', 2)).resolves.toEqual([
    {
      args: [],
      command: 'sample.empty',
      extensionId: 'sample.extension',
      key: 'C',
    },
    {
      args: ['value'],
      command: 'sample.args',
      extensionId: 'sample.extension',
      key: 'D',
      when: 'editorFocus',
    },
    {
      command: 'anonymous.run',
      extensionId: '',
      key: 'E',
    },
  ])
})

test('infers extension id from path when uri is missing', async () => {
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [
        {
          keybindings: [{ command: 'sample.run', key: 'Enter' }],
          path: '/extensions/path.extension',
        },
      ]
    },
  })

  await expect(getKeyBindings('/assets', 2)).resolves.toEqual([
    {
      command: 'sample.run',
      extensionId: 'path.extension',
      key: 'Enter',
    },
  ])
})
