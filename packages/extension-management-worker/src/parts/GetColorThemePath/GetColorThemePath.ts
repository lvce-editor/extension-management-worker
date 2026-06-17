import * as Path from '../Path/Path.ts'

const getColorThemeUriFromExtension = (extension: any, colorThemeId: string): string => {
  if (!extension.colorThemes) {
    return ''
  }
  for (const colorTheme of extension.colorThemes) {
    if (colorTheme.id === colorThemeId) {
      return Path.join('/', extension.uri, colorTheme.path)
    }
  }
  return ''
}

export const getColorThemeUri = (extensions: any, colorThemeId: string): string => {
  for (const extension of extensions) {
    const absolutePath = getColorThemeUriFromExtension(extension, colorThemeId)
    if (absolutePath) {
      return absolutePath
    }
  }
  return ''
}
