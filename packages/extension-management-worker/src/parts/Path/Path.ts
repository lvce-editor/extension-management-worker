export const join = (pathSeparator: string, ...parts: readonly string[]): string => {
  return parts.join(pathSeparator)
}
