const getExtensionColorThemeNames = (extension: any) => {
  return extension.colorThemes || []
}

const getColorThemeId = (colorTheme: any) => {
  return colorTheme.id
}

// TODO should send names to renderer worker or names with ids?
export const getColorThemeNamesFromExtensions = async (extensions: readonly any[]) => {
  const colorThemes = extensions.flatMap(getExtensionColorThemeNames)
  const colorThemeNames = colorThemes.map(getColorThemeId)
  return colorThemeNames
}
