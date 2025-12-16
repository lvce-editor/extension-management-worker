import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'extension-detail.disable-extension'

export const test: Test = async ({ expect, Extension, ExtensionDetail, Locator }) => {
  // arrange
  const extensionUri = import.meta.resolve('../fixtures/extension-disable')
  await Extension.addWebExtension(extensionUri)
  await ExtensionDetail.open('test.extension-enable-error')
  const disableButton = Locator('.ExtensionDetail [name="Disable"]')
  await expect(disableButton).toBeVisible()
  const enableButton = Locator('.ExtensionDetail [name="Enable"]')
  await expect(enableButton).toBeHidden()

  // act
  await ExtensionDetail.handleClickDisable()

  // assert
  await expect(disableButton).toBeHidden()
  await expect(enableButton).toBeVisible()
}
