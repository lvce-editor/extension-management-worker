import * as GetColorThemeNamesFromExtensions from '../GetColorThemeNamesFromExtensions/GetColorThemeNamesFromExtensions.ts'
import * as GetExtensions from '../GetExtensions/GetExtensions.ts'

export const getColorThemeNames = async (): Promise<readonly any[]> => {
  const extensions = await GetExtensions.getAllExtensions()
  const colorThemeNames = GetColorThemeNamesFromExtensions.getColorThemeNamesFromExtensions(extensions)
  return colorThemeNames
}
