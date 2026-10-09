import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const isWorkspaceProgressData = (value: unknown): value is { readonly message: string; readonly status: string } => {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return typeof data.message === 'string' && ['idle', 'in-progress', 'finished', 'error'].includes(String(data.status))
}

export const getWorkspaceProgressData = async (applicationId?: string): Promise<{ readonly message: string; readonly status: string }> => {
  const extensionIds = IsolatedExtensionHostWorkerState.getIds(applicationId)
  for (const extensionId of extensionIds) {
    const rpc = IsolatedExtensionHostWorkerState.get(extensionId, applicationId)
    if (!rpc) continue
    try {
      const values = await rpc.invoke('ExtensionApi.getWorkspaceProgressData')
      if (!Array.isArray(values)) continue
      const value = values.find((item) => isWorkspaceProgressData(item) && item.status !== 'idle')
      if (value && isWorkspaceProgressData(value)) return value
    } catch {
      // Extensions without a workspace progress provider are expected.
    }
  }
  return { message: '', status: 'idle' }
}
