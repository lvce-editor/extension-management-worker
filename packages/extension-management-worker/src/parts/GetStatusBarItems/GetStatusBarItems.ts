import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const getItems = async (rpc: any): Promise<readonly any[]> => {
  return rpc.invoke('ExtensionApi.getStatusBarItems')
}

export const getStatusBarItems = async (applicationId?: string): Promise<readonly any[]> => {
  const extensionIds = IsolatedExtensionHostWorkerState.getIds(applicationId)
  const results = await Promise.all(
    extensionIds.map(async (extensionId) => {
      const rpc = IsolatedExtensionHostWorkerState.get(extensionId, applicationId)
      if (!rpc) {
        return []
      }
      const items = await getItems(rpc)
      return items.map((item) => ({ ...item, extensionId }))
    }),
  )
  return results.flat()
}

export const getStatusBarItemContextMenuItems = async (extensionId: string, providerId: string, applicationId?: string): Promise<readonly any[]> => {
  const rpc = IsolatedExtensionHostWorkerState.get(extensionId, applicationId)
  if (!rpc) {
    return []
  }
  try {
    const items = await rpc.invoke('ExtensionApi.getStatusBarItemContextMenuItems', providerId)
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
}
