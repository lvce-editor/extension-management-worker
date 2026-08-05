import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'extension-manifest.categories'

export const test: Test = async ({ Command, Extension }) => {
  const extensionUri = import.meta.resolve('../fixtures/extension-contributions')
  await Extension.addWebExtension(extensionUri)
  const extension = await Command.execute('ExtensionManagement.getExtension', 'test.extension-contributions')
  const expected = ['Programming Languages', 'Themes']
  if (JSON.stringify(extension.categories) !== JSON.stringify(expected)) {
    throw new Error(`Expected extension categories ${JSON.stringify(expected)}, got ${JSON.stringify(extension.categories)}`)
  }
}
