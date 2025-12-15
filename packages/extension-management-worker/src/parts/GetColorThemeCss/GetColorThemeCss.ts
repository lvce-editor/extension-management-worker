import * as CreateColorThemeFromJson from '../CreateColorThemeFromJson/CreateColorThemeFromJson.ts'
import * as GetColorThemeCssCached from '../GetColorThemeCssCached/GetColorThemeCssCached.ts'
import * as GetColorThemeJson from '../GetColorThemeJson/GetColorThemeJson.ts'

export const getColorThemeCssFromJson = async (colorThemeId: any, colorThemeJson: any) => {
  const colorThemeCss = CreateColorThemeFromJson.createColorThemeFromJson(/* colorThemeId */ colorThemeId, /* colorThemeJson */ colorThemeJson)
  return colorThemeCss
  // TODO generate color theme from jsonc
}

const getColorThemeCssNew = async (colorThemeId: any, platform: number) => {
  const colorThemeJson = await GetColorThemeJson.getColorThemeJson(colorThemeId, platform)
  const colorThemeCss = await getColorThemeCssFromJson(colorThemeId, colorThemeJson)
  return colorThemeCss
}

export const getColorThemeCss = (colorThemeId: any, platform: number) => {
  return GetColorThemeCssCached.getColorThemeCssCached(colorThemeId, platform, getColorThemeCssNew)
}
