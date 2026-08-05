import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'languages.includes-primary'

export const test: Test = async ({ Command, Extension }) => {
  const extensionUri = import.meta.resolve('../fixtures/extension-contributions')
  await Extension.addWebExtension(extensionUri)
  const extension = await Command.execute('ExtensionManagement.getExtension', 'test.extension-contributions')
  const { languages } = extension
  if (!Array.isArray(languages)) {
    throw new TypeError(`Expected languages to be an array, got ${JSON.stringify(languages)}`)
  }
  if (languages.every((language) => language.id !== 'test-language')) {
    throw new Error(`Expected test-language in ${JSON.stringify(languages)}`)
  }
}
