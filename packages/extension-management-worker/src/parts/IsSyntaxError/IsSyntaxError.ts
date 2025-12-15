export const isSyntaxError = (error: unknown): boolean => {
  return error instanceof SyntaxError
}
