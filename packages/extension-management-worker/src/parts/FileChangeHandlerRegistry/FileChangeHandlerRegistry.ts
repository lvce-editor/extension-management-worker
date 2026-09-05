const extensionIds = new Set<string>()
const applications = new Map<string, Set<string>>()

export const register = (extensionId: string, applicationId?: string): void => {
  if (applicationId === undefined) {
    extensionIds.add(extensionId)
    return
  }
  const ids = applications.get(applicationId) || new Set<string>()
  ids.add(extensionId)
  applications.set(applicationId, ids)
}

export const unregister = (extensionId: string, applicationId?: string): void => {
  if (applicationId === undefined) {
    extensionIds.delete(extensionId)
    return
  }
  const ids = applications.get(applicationId)
  ids?.delete(extensionId)
  if (ids?.size === 0) {
    applications.delete(applicationId)
  }
}

export const getRegisteredExtensionIds = (applicationId?: string): readonly string[] => {
  return [...(applicationId === undefined ? extensionIds : applications.get(applicationId) || [])]
}

export const reset = (applicationId?: string): void => {
  if (applicationId === undefined) {
    extensionIds.clear()
  } else {
    applications.delete(applicationId)
  }
}
