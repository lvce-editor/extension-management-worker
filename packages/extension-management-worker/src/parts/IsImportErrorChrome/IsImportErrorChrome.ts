export const isImportErrorChrome = (error: unknown): boolean => {
  return Boolean(error && error instanceof Error && error.message.startsWith('Failed to fetch dynamically imported module'))
}
