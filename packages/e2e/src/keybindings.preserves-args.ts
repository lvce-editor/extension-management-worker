import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'keybindings.preserves-args'

export const test: Test = async ({ Command, Extension }) => {
  const extensionUri = import.meta.resolve('../fixtures/extension-contributions')
  await Extension.addWebExtension(extensionUri)
  const extension = await Command.execute('ExtensionManagement.getExtension', 'test.extension-contributions')
  const keyBindings = extension.keybindings
  if (!Array.isArray(keyBindings)) {
    throw new TypeError(`Expected keybindings to be an array, got ${JSON.stringify(keyBindings)}`)
  }
  const keyBinding = keyBindings.find((item) => item.command === 'test.args')
  const expected = ['first', 2]
  if (JSON.stringify(keyBinding?.args) !== JSON.stringify(expected)) {
    throw new Error(`Expected keybinding args ${JSON.stringify(expected)}, got ${JSON.stringify(keyBinding?.args)}`)
  }
}
