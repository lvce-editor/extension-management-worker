export const getColorThemeJsonCacheKey = (source: string): string => {
  return `https://color-theme.cache/${encodeURIComponent(source)}`
}
