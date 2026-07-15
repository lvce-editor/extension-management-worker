export const isAbsoluteIcon = (icon: string): boolean => {
  return icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('file://') || icon.startsWith('/')
}
