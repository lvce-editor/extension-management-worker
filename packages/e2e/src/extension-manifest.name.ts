import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'extension-manifest.name'

export const test: Test = async ({ Command, Extension }) => {
  const extensionUri = import.meta.resolve('../fixtures/extension-contributions')
  await Extension.addWebExtension(extensionUri)
  const extension = await Command.execute('ExtensionManagement.getExtension', 'test.extension-contributions')
  if (extension.name !== 'Extension Contributions') {
    throw new Error(`Expected extension name Extension Contributions, got ${JSON.stringify(extension.name)}`)
  }
}
