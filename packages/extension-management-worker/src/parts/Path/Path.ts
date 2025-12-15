export const dirname = (pathSeparator: string, path: string): string => {
  const index = path.lastIndexOf(pathSeparator)
  if (index === -1) {
    return path
  }
  return path.slice(0, index)
}

export const extname = (path: string): string => {
  const index = path.lastIndexOf('.')
  if (index === -1) {
    return ''
  }
  return path.slice(index)
}

export const join = (pathSeparator: string, ...parts: readonly string[]): string => {
  return parts.join(pathSeparator)
}
