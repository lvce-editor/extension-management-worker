import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'extension-manifest.uri'

export const test: Test = async ({ Command, Extension }) => {
  const extensionUri = import.meta.resolve('../fixtures/extension-contributions')
  await Extension.addWebExtension(extensionUri)
  const extension = await Command.execute('ExtensionManagement.getExtension', 'test.extension-contributions')
  if (extension.uri !== extensionUri) {
    throw new Error(`Expected extension uri ${JSON.stringify(extensionUri)}, got ${JSON.stringify(extension.uri)}`)
  }
}
