import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'extension-detail.shows-description'

export const test: Test = async ({ expect, Extension, ExtensionDetail, Locator }) => {
  const extensionUri = import.meta.resolve('../fixtures/extension-contributions')
  await Extension.addWebExtension(extensionUri)
  await ExtensionDetail.open('test.extension-contributions')
  const description = Locator('.ExtensionDetailDescription')
  await expect(description).toHaveText('Exercises extension manifest contributions in end-to-end tests')
}
