import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'color-themes.includes-dark'

export const test: Test = async ({ Command, Extension }) => {
  const extensionUri = import.meta.resolve('../fixtures/extension-contributions')
  await Extension.addWebExtension(extensionUri)
  const platform = await Command.execute('Layout.getPlatform')
  const themeNames = await Command.execute('ColorTheme.getColorThemeNames', '', platform)
  if (!Array.isArray(themeNames)) {
    throw new TypeError(`Expected color theme names to be an array, got ${JSON.stringify(themeNames)}`)
  }
  if (!themeNames.includes('test-dark-theme')) {
    throw new Error(`Expected dark theme in ${JSON.stringify(themeNames)}`)
  }
}
