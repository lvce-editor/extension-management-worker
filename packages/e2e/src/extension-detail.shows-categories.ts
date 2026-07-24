import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'extension-detail.shows-categories'

export const test: Test = async ({ expect, Extension, ExtensionDetail, Locator }) => {
  const extensionUri = import.meta.resolve('../fixtures/extension-contributions')
  await Extension.addWebExtension(extensionUri)
  await ExtensionDetail.open('test.extension-contributions')
  const categories = Locator('.ExtensionDetail .Category')
  await expect(categories).toHaveCount(2)
  const firstCategory = categories.nth(0)
  await expect(firstCategory).toHaveText('Programming Languages')
  const secondCategory = categories.nth(1)
  await expect(secondCategory).toHaveText('Themes')
}
