import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'color-theme-quick-pick.disabled-extension'

const ThemeId = 'test-disabled-extension-theme'

export const test: Test = async ({ Command, expect, Extension, ExtensionDetail, FileSystem, Locator, QuickPick, Workspace }) => {
  // arrange
  const workspaceUri = await FileSystem.getTmpDir()
  await Workspace.setPath(workspaceUri)
  const extensionUri = import.meta.resolve('../fixtures/extension-color-theme-quick-pick')
  await Extension.addWebExtension(extensionUri)
  await ExtensionDetail.open('test.color-theme-quick-pick')
  await ExtensionDetail.handleClickEnable()
  const quickPick = Locator('.QuickPick')
  const themeItem = Locator('.QuickPickItem', { hasText: ThemeId })
  const platform = await Command.execute('Layout.getPlatform')
  const expectThemeIncluded = async (included: boolean): Promise<void> => {
    const themeNames = await Command.execute('ColorTheme.getColorThemeNames', '', platform)
    if (themeNames.includes(ThemeId) !== included) {
      throw new Error(`Expected contributed theme included=${included} for platform=${platform} in ${JSON.stringify(themeNames)}`)
    }
  }
  await expectThemeIncluded(true)

  await Command.execute('QuickPick.showColorTheme')
  await QuickPick.handleInput(ThemeId)
  await expect(themeItem).toBeVisible()
  await Command.execute('Viewlet.closeWidget', 'QuickPick')
  await expect(quickPick).toBeHidden()

  // act - disable the theme extension
  await ExtensionDetail.handleClickDisable()
  await expectThemeIncluded(false)
  await Command.execute('QuickPick.showColorTheme')
  await QuickPick.handleInput(ThemeId)

  // assert - the disabled extension theme is no longer offered
  await expect(themeItem).toBeHidden()
  await Command.execute('Viewlet.closeWidget', 'QuickPick')
  await expect(quickPick).toBeHidden()

  // act - enable the theme extension again
  await ExtensionDetail.handleClickEnable()
  await expectThemeIncluded(true)
  await Command.execute('QuickPick.showColorTheme')
  await QuickPick.handleInput(ThemeId)

  // assert - the enabled extension theme is offered again
  await expect(themeItem).toBeVisible()
}
