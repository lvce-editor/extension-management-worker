const addSemicolon = (directive: string): string => {
  return directive.endsWith(';') ? directive : `${directive};`
}

export const getContentSecurityPolicy = (directives: readonly string[] | undefined): string => {
  if (!directives) {
    return ''
  }
  return directives.map(addSemicolon).join(' ')
}
