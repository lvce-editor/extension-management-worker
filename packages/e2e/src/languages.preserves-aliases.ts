import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'languages.preserves-aliases'

export const test: Test = async ({ Command, Extension }) => {
  const extensionUri = import.meta.resolve('../fixtures/extension-contributions')
  await Extension.addWebExtension(extensionUri)
  const extension = await Command.execute('ExtensionManagement.getExtension', 'test.extension-contributions')
  const { languages } = extension
  if (!Array.isArray(languages)) {
    throw new TypeError(`Expected languages to be an array, got ${JSON.stringify(languages)}`)
  }
  const language = languages.find((item) => item.id === 'test-language')
  const expected = ['Test Language', 'test']
  if (JSON.stringify(language?.aliases) !== JSON.stringify(expected)) {
    throw new Error(`Expected language aliases ${JSON.stringify(expected)}, got ${JSON.stringify(language?.aliases)}`)
  }
}
