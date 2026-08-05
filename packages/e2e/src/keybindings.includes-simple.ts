import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'keybindings.includes-simple'

export const test: Test = async ({ Command, Extension }) => {
  const extensionUri = import.meta.resolve('../fixtures/extension-contributions')
  await Extension.addWebExtension(extensionUri)
  const extension = await Command.execute('ExtensionManagement.getExtension', 'test.extension-contributions')
  const keyBindings = extension.keybindings
  if (!Array.isArray(keyBindings)) {
    throw new TypeError(`Expected keybindings to be an array, got ${JSON.stringify(keyBindings)}`)
  }
  const keyBinding = keyBindings.find((item) => item.command === 'test.simple')
  if (keyBinding?.key !== 'Ctrl+1') {
    throw new Error(`Expected simple keybinding key Ctrl+1, got ${JSON.stringify(keyBinding?.key)}`)
  }
}
