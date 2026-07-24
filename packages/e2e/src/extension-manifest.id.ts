import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'extension-manifest.id'

export const test: Test = async ({ Command, Extension }) => {
  const extensionUri = import.meta.resolve('../fixtures/extension-contributions')
  await Extension.addWebExtension(extensionUri)
  const extension = await Command.execute('ExtensionManagement.getExtension', 'test.extension-contributions')
  if (extension.id !== 'test.extension-contributions') {
    throw new Error(`Expected extension id test.extension-contributions, got ${JSON.stringify(extension.id)}`)
  }
}
