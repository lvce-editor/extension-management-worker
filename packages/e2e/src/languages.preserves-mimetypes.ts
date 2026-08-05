// cspell:ignore mimetypes
import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'languages.preserves-mimetypes'

export const test: Test = async ({ Command, Extension }) => {
  const extensionUri = import.meta.resolve('../fixtures/extension-contributions')
  await Extension.addWebExtension(extensionUri)
  const extension = await Command.execute('ExtensionManagement.getExtension', 'test.extension-contributions')
  const { languages } = extension
  if (!Array.isArray(languages)) {
    throw new TypeError(`Expected languages to be an array, got ${JSON.stringify(languages)}`)
  }
  const language = languages.find((item) => item.id === 'test-language')
  if (JSON.stringify(language?.mimetypes) !== JSON.stringify(['text/x-test'])) {
    throw new Error(`Expected language mimetypes ["text/x-test"], got ${JSON.stringify(language?.mimetypes)}`)
  }
}
