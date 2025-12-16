import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'extension-detail.enable-extension'

export const skip = 1

export const test: Test = async ({ expect, Extension, ExtensionDetail, Locator }) => {
  // arrange
  const extensionUri = import.meta.resolve('../fixtures/extension-enable')
  await Extension.addWebExtension(extensionUri)
  await ExtensionDetail.open('test.extension-enable')
  await ExtensionDetail.handleClickDisable()
  const enableButton = Locator('.ExtensionDetail [name="Enable"]')
  await expect(enableButton).toBeVisible()
  const disableButton = Locator('.ExtensionDetail [name="Disable"]')
  await expect(disableButton).toBeHidden()

  // act
  await ExtensionDetail.handleClickEnable()

  // assert
  await expect(enableButton).toBeHidden()
  await expect(disableButton).toBeVisible()
}
