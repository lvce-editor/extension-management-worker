import * as GetJson from '../GetJson/GetJson.ts'

const getColorThemeUrlWeb = (assetDir: string, colorThemeId: string) => {
  return `${assetDir}/extensions/builtin.theme-${colorThemeId}/color-theme.json`
}

export const getColorThemeJson = (colorThemeId: string, assetDir: string) => {
  const url = getColorThemeUrlWeb(assetDir, colorThemeId)
  // TODO handle error ?
  return GetJson.getJson(url)
}
