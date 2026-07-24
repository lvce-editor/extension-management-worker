import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'color-themes.preserves-order'

export const test: Test = async ({ Command, Extension }) => {
  const extensionUri = import.meta.resolve('../fixtures/extension-contributions')
  await Extension.addWebExtension(extensionUri)
  const platform = await Command.execute('Layout.getPlatform')
  const themeNames = await Command.execute('ColorTheme.getColorThemeNames', '', platform)
  if (!Array.isArray(themeNames)) {
    throw new TypeError(`Expected color theme names to be an array, got ${JSON.stringify(themeNames)}`)
  }
  const contributionThemeNames = themeNames.filter((themeName) => themeName.startsWith('test-'))
  const expected = ['test-light-theme', 'test-dark-theme']
  if (JSON.stringify(contributionThemeNames) !== JSON.stringify(expected)) {
    throw new Error(`Expected contributed color theme order ${JSON.stringify(expected)}, got ${JSON.stringify(contributionThemeNames)}`)
  }
}
