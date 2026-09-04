import type { Rpc } from '@lvce-editor/rpc'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import { getErrorMessage } from '../GetErrorMessage/GetErrorMessage.ts'
import * as GetOrCreateIsolatedExtensionHostWorker from '../GetOrCreateIsolatedExtensionHostWorker/GetOrCreateIsolatedExtensionHostWorker.ts'
import * as RuntimeStatusType from '../RuntimeStatusType/RuntimeStatusType.ts'

type GetOrCreate = typeof GetOrCreateIsolatedExtensionHostWorker.getOrCreateIsolatedExtensionHostWorker

export const activateIsolatedExtension = async (
  extensionId: string,
  absolutePath: string,
  workerName: string,
  contentSecurityPolicy: string,
  activationEvent: string,
  getOrCreate: GetOrCreate = GetOrCreateIsolatedExtensionHostWorker.getOrCreateIsolatedExtensionHostWorker,
): Promise<Rpc> => {
  const startTime = performance.now()
  ExtensionsState.updateRuntimeStatus(extensionId, {
    activationEvent,
    activationStartTime: startTime,
    status: RuntimeStatusType.Activating,
  })
  try {
    const rpc = await getOrCreate(extensionId, absolutePath, workerName, contentSecurityPolicy)
    const endTime = performance.now()
    ExtensionsState.updateRuntimeStatus(extensionId, {
      activationEndTime: endTime,
      activationTime: endTime - startTime,
      status: RuntimeStatusType.Activated,
    })
    return rpc
  } catch (error) {
    ExtensionsState.updateRuntimeStatus(extensionId, {
      error: getErrorMessage(error),
      status: RuntimeStatusType.Error,
    })
    throw error
  }
}
