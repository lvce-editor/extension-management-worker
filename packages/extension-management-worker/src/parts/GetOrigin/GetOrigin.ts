export const getOrigin = (): string => {
  return globalThis.location?.origin || 'http://localhost'
}
