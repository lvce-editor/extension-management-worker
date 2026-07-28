const extensionIds = new Set<string>()

export const register = (extensionId: string): void => {
  extensionIds.add(extensionId)
}

export const unregister = (extensionId: string): void => {
  extensionIds.delete(extensionId)
}

export const getRegisteredExtensionIds = (): readonly string[] => {
  return [...extensionIds]
}

export const reset = (): void => {
  extensionIds.clear()
}
