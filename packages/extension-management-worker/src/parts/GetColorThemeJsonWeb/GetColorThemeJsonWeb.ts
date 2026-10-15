import * as GetColorThemeJsonCached from '../GetColorThemeJsonCached/GetColorThemeJsonCached.ts'
import * as GetJson from '../GetJson/GetJson.ts'

const getColorThemeUrlWeb = (assetDir: string, colorThemeId: string) => {
  return `${assetDir}/extensions/builtin.theme-${colorThemeId}/color-theme.json`
}

export const getColorThemeJson = (colorThemeId: string, assetDir: string, forceReload = false) => {
  const url = getColorThemeUrlWeb(assetDir, colorThemeId)
  return getJsonCached(url, forceReload)
}

const getJsonCached = async (url: string, forceReload: boolean): Promise<any> => {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    if (!response.ok) {
      return GetJson.getJson(url)
    }
    const etag = response.headers.get('etag')
    if (!etag) {
      return GetJson.getJson(url)
    }
    return GetColorThemeJsonCached.getColorThemeJsonCached(url, etag, () => GetJson.getJson(url), forceReload)
  } catch {
    return GetJson.getJson(url)
  }
}
