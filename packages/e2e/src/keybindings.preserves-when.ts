import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'keybindings.preserves-when'

export const test: Test = async ({ Command, Extension }) => {
  const extensionUri = import.meta.resolve('../fixtures/extension-contributions')
  await Extension.addWebExtension(extensionUri)
  const extension = await Command.execute('ExtensionManagement.getExtension', 'test.extension-contributions')
  const keyBindings = extension.keybindings
  if (!Array.isArray(keyBindings)) {
    throw new TypeError(`Expected keybindings to be an array, got ${JSON.stringify(keyBindings)}`)
  }
  const keyBinding = keyBindings.find((item) => item.command === 'test.when')
  if (keyBinding?.when !== 'editorFocus') {
    throw new Error(`Expected keybinding when clause editorFocus, got ${JSON.stringify(keyBinding?.when)}`)
  }
}
