import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'extension-manifest.description'

export const test: Test = async ({ Command, Extension }) => {
  const extensionUri = import.meta.resolve('../fixtures/extension-contributions')
  await Extension.addWebExtension(extensionUri)
  const extension = await Command.execute('ExtensionManagement.getExtension', 'test.extension-contributions')
  const expected = 'Exercises extension manifest contributions in end-to-end tests'
  if (extension.description !== expected) {
    throw new Error(`Expected extension description ${JSON.stringify(expected)}, got ${JSON.stringify(extension.description)}`)
  }
}
