import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'add-web-extension.deduplicates-uri'

export const test: Test = async ({ expect, Extension, ExtensionDetail, Locator }) => {
  const extensionUri = import.meta.resolve('../fixtures/extension-contributions')
  await Extension.addWebExtension(extensionUri)
  await Extension.addWebExtension(extensionUri)
  await ExtensionDetail.open('test.extension-contributions')
  const extensionName = Locator('.ExtensionDetailName')
  await expect(extensionName).toHaveCount(1)
  await expect(extensionName).toHaveText('Extension Contributions')
}
