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
  applicationId?: string,
): Promise<Rpc> => {
  const application = applicationId === undefined ? undefined : ExtensionsState.get(applicationId)
  const updateStatus = (status: Parameters<typeof ExtensionsState.updateRuntimeStatus>[1]): void => {
    if (applicationId === undefined) {
      ExtensionsState.updateRuntimeStatus(extensionId, status)
      return
    }
    const current = ExtensionsState.get(applicationId)
    if (current.applicationGeneration !== application?.applicationGeneration) {
      throw new Error(`Stale extension application: ${applicationId}`)
    }
    ExtensionsState.updateRuntimeStatus(extensionId, status, applicationId)
  }
  const startTime = performance.now()
  updateStatus({
    activationEvent,
    activationStartTime: startTime,
    status: RuntimeStatusType.Activating,
  })
  try {
    const rpc =
      applicationId === undefined
        ? await getOrCreate(extensionId, absolutePath, workerName, contentSecurityPolicy)
        : await getOrCreate(extensionId, absolutePath, workerName, contentSecurityPolicy, undefined, applicationId)
    const endTime = performance.now()
    updateStatus({
      activationEndTime: endTime,
      activationTime: endTime - startTime,
      status: RuntimeStatusType.Activated,
    })
    return rpc
  } catch (error) {
    if (application === undefined || ExtensionsState.isCurrentApplication(application)) {
      updateStatus({
        error: getErrorMessage(error),
        status: RuntimeStatusType.Error,
      })
    }
    throw error
  }
}
