import * as FileSystem from '../FileSystem/FileSystem.ts'
import * as GetColorThemeJsonCached from '../GetColorThemeJsonCached/GetColorThemeJsonCached.ts'
import * as GetColorThemePath from '../GetColorThemePath/GetColorThemePath.ts'
import * as GetExtensions from '../GetExtensions/GetExtensions.ts'

export const getColorThemeJson = async (colorThemeId: string, assetDir: string, platform: number, forceReload = false): Promise<any> => {
  const extensions = await GetExtensions.getAllExtensions(assetDir, platform)
  const colorThemeUri = GetColorThemePath.getColorThemeUri(extensions, colorThemeId)
  if (!colorThemeUri) {
    return {}
  }
  try {
    const stat = await FileSystem.statWithMetadata(colorThemeUri)
    if (typeof stat?.mtimeMs !== 'number' || typeof stat?.size !== 'number') {
      return await FileSystem.readJson(colorThemeUri)
    }
    const validator = JSON.stringify({ mtimeMs: stat.mtimeMs, size: stat.size })
    return GetColorThemeJsonCached.getColorThemeJsonCached(colorThemeUri, validator, () => FileSystem.readJson(colorThemeUri), forceReload)
  } catch {
    return FileSystem.readJson(colorThemeUri)
  }
}
