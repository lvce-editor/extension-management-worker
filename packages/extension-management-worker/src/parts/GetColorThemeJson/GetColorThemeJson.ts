import { PlatformType } from '@lvce-editor/constants'
import * as GetColorThemeJsonRemote from '../GetColorThemeJsonRemote/GetColorThemeJsonRemote.ts'
import * as GetColorThemeJsonWeb from '../GetColorThemeJsonWeb/GetColorThemeJsonWeb.ts'

export const getColorThemeJson = (colorThemeId: string, platform: number, assetDir: string) => {
  if (platform === PlatformType.Web) {
    return GetColorThemeJsonWeb.getColorThemeJson(colorThemeId, assetDir)
  }
  return GetColorThemeJsonRemote.getColorThemeJson(colorThemeId)
}
