import { RendererWorker } from '@lvce-editor/rpc-registry'
import type { RuntimeStatus } from '../RuntimeStatus/RuntimeStatus.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import * as RuntimeStatusType from '../RuntimeStatusType/RuntimeStatusType.ts'

const emptyStatus: RuntimeStatus = {
  activationEndTime: 0,
  activationEvent: '',
  activationStartTime: 0,
  activationTime: 0,
  id: '',
  importEndTime: 0,
  importStartTime: 0,
  importTime: 0,
  status: RuntimeStatusType.None,
}

type GetMemoryUsage = (extensionId: string) => Promise<number>

const getMemoryUsage = (extensionId: string): Promise<number> => {
  return RendererWorker.invoke('LaunchIsolatedExtensionHostWorker.getMemoryUsage', extensionId)
}

const getMemoryUsageSafe = async (extensionId: string, get: GetMemoryUsage): Promise<number> => {
  try {
    const memoryUsage = await get(extensionId)
    return Number.isFinite(memoryUsage) && memoryUsage > 0 ? memoryUsage : 0
  } catch {
    return 0
  }
}

export const getRuntimeStatus = async (extensionId: string, get: GetMemoryUsage = getMemoryUsage): Promise<RuntimeStatus> => {
  const status = ExtensionsState.getRuntimeStatus(extensionId) || emptyStatus
  const memoryUsage = status.status === RuntimeStatusType.Activated ? await getMemoryUsageSafe(extensionId, get) : 0
  return {
    ...status,
    memoryUsage,
  }
}
