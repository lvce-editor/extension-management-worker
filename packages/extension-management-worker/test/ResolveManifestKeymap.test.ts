// cspell:words keymap keymaps
import { expect, test } from '@jest/globals'
import { resolveManifestKeymap } from '../src/parts/ResolveManifestKeymap/ResolveManifestKeymap.ts'

const keyMap = {
  initialMode: 'normal',
  modes: { insert: { bindings: {} }, normal: { bindings: { i: { args: ['i'], command: 'vim.handleKey', mode: 'insert' } }, captureText: true } },
}
const extension = { commands: [{ id: 'vim.handleKey' }], id: 'vim', keyMap }

test('routes contributed keys through the extension command without mutating the manifest', () => {
  const result = resolveManifestKeymap([extension], 'vim')
  expect(result.modes.normal.bindings.i).toEqual({ args: ['vim.handleKey', 'i'], command: 'ExtensionHost.executeCommand', mode: 'insert' })
  expect(result.modes.normal.captureText).toBe(true)
  expect(extension.keyMap.modes.normal.bindings.i.command).toBe('vim.handleKey')
})

test('does not resolve missing, disabled, or other application contributions', () => {
  expect(() => resolveManifestKeymap([], 'vim')).toThrow('does not contribute a keyMap')
  expect(() => resolveManifestKeymap([{ ...extension, disabled: true }], 'vim')).toThrow('does not contribute a keyMap')
  expect(() => resolveManifestKeymap([{ id: 'vim' }], 'vim')).toThrow('does not contribute a keyMap')
})

test('rejects renderer commands and commands belonging to another extension', () => {
  expect(() => resolveManifestKeymap([{ ...extension, commands: [] }], 'vim')).toThrow('must call a command contributed by vim')
  expect(() =>
    resolveManifestKeymap(
      [{ ...extension, keyMap: { initialMode: 'normal', modes: { normal: { bindings: { h: { command: 'Editor.cursorLeft' } } } } } }],
      'vim',
    ),
  ).toThrow('must call a command contributed by vim')
})
