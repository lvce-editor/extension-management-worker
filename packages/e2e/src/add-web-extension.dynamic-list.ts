import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'add-web-extension.dynamic-list'

export const test: Test = async ({ expect, Extension, ExtensionDetail, Locator }) => {
  const extensionUri = import.meta.resolve('../fixtures/extension-contributions')
  await Extension.addWebExtension(extensionUri)
  await ExtensionDetail.open('test.extension-contributions')
  const detail = Locator('.ExtensionDetail')
  await expect(detail).toBeVisible()
}
