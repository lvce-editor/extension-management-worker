import * as Path from '../Path/Path.ts'

export const getColorThemeUri = (extensions: any, colorThemeId: string): string => {
  for (const extension of extensions) {
    if (!extension.colorThemes) {
      continue
    }
    for (const colorTheme of extension.colorThemes) {
      if (colorTheme.id !== colorThemeId) {
        continue
      }
      const absolutePath = Path.join('/', extension.uri, colorTheme.path)
      return absolutePath
    }
  }
  return ''
}
