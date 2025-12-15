import * as GetColorThemeCssCachedNoop from '../GetColorThemeCssCachedNoop/GetColorThemeCssCachedNoop.ts'
// TODO make storage configurable via settings as localstorage or indexeddb
// also allow disabling caching via settings
// then measure which option could be fastest

const getCacheFn = (config: string) => {
  switch (config) {
    default:
      return GetColorThemeCssCachedNoop
  }
}

export const getColorThemeCssCached = async (colorThemeId: string, platform: number, getData: any) => {
  const config = ''
  const module = getCacheFn(config)
  const cachedData = module.get(colorThemeId)
  if (cachedData) {
    return cachedData
  }
  const newData = await getData(colorThemeId, platform)
  module.set(colorThemeId, newData)
  return newData
}
