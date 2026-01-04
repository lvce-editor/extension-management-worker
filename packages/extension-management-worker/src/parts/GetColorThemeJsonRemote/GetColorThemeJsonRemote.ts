import * as FileSystem from '../FileSystem/FileSystem.ts'
import * as GetColorThemePath from '../GetColorThemePath/GetColorThemePath.ts'
import * as GetExtensions from '../GetExtensions/GetExtensions.ts'

export const getColorThemeJson = async (colorThemeId: string, assetDir: string, platform: number): Promise<any> => {
  const extensions = await GetExtensions.getAllExtensions(assetDir, platform)
  const colorThemeUri = GetColorThemePath.getColorThemeUri(extensions, colorThemeId)
  if (!colorThemeUri) {
    return {}
  }
  const json = await FileSystem.readJson(colorThemeUri)
  return json
}
