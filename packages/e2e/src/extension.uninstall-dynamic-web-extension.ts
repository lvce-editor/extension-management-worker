import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'extension.uninstall-dynamic-web-extension'

export const test: Test = async ({ expect, Extension, ExtensionDetail, Locator, Main }) => {
  const extension = Extension as typeof Extension & { uninstall(id: string): Promise<void> }
  const extensionId = 'test.extension-enable-error'
  const extensionUri = import.meta.resolve('../fixtures/extension-disable')
  await Extension.addWebExtension(extensionUri)
  await ExtensionDetail.open(extensionId)
  const extensionName = Locator('.ExtensionDetailName')
  await expect(extensionName).toHaveText('Test')

  await extension.uninstall(extensionId)
  await Main.closeActiveEditor()
  await ExtensionDetail.open(extensionId)

  const errorTitle = Locator('.ExtensionDetailErrorTitle')
  const errorMessage = Locator('.ExtensionDetailErrorMessage')
  await expect(errorTitle).toHaveText('Unable to load extension')
  await expect(errorMessage).toHaveText(`The extension "${extensionId}" is not available in this version of LVCE Editor.`)
}
