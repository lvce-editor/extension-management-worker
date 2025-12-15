export const isImportErrorFirefox = (error: unknown): boolean => {
  return Boolean(error && error instanceof TypeError && error.message === 'error loading dynamically imported module')
}
