import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'extension-detail.shows-name'

export const test: Test = async ({ expect, Extension, ExtensionDetail, Locator }) => {
  const extensionUri = import.meta.resolve('../fixtures/extension-contributions')
  await Extension.addWebExtension(extensionUri)
  await ExtensionDetail.open('test.extension-contributions')
  const name = Locator('.ExtensionDetailName')
  await expect(name).toHaveText('Extension Contributions')
}
