export const isRelativeIconPath = (icon: string): boolean => {
  return icon.startsWith('./') || icon.startsWith('../') || icon.includes('/') || /\.(?:bmp|gif|ico|jpe?g|png|svg|webp)$/i.test(icon)
}
