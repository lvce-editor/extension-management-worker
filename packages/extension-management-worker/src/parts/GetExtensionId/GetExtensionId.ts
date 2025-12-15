const baseName = (path: string): string => {
  const slashIndex = path.lastIndexOf('/')
  return path.slice(slashIndex + 1)
}

export const getExtensionId = (extension: any): string => {
  if (extension && extension.id) {
    return extension.id
  }
  if (extension && extension.path) {
    return baseName(extension.path)
  }
  return '<unknown>'
}
