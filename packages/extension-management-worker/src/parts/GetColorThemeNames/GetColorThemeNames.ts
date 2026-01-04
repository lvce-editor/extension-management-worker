import * as GetColorThemeNamesFromExtensions from '../GetColorThemeNamesFromExtensions/GetColorThemeNamesFromExtensions.ts'
import * as GetExtensions from '../GetExtensions/GetExtensions.ts'

export const getColorThemeNames = async (assetDir: string, platform: number): Promise<readonly any[]> => {
  const extensions = await GetExtensions.getAllExtensions(assetDir, platform)
  const colorThemeNames = GetColorThemeNamesFromExtensions.getColorThemeNamesFromExtensions(extensions)
  return colorThemeNames
}
