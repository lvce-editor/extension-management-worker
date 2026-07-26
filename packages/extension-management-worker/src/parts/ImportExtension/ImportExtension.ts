import * as Assert from '@lvce-editor/assert'
import { ExtensionHost } from '@lvce-editor/rpc-registry'
import { VError } from '@lvce-editor/verror'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import { getErrorMessage } from '../GetErrorMessage/GetErrorMessage.ts'
import * as IsImportError from '../IsImportError/IsImportError.ts'
import * as RuntimeStatusType from '../RuntimeStatusType/RuntimeStatusType.ts'
import * as TryToGetActualImportErrorMessage from '../TryToGetActualImportErrorMessage/TryToGetActualImportErrorMessage.ts'

export const importExtension = async (extensionId: string, absolutePath: string, activationEvent: string, extensionHost: any = ExtensionHost) => {
  try {
    Assert.string(absolutePath)
    const startTime = performance.now()
    ExtensionsState.setRuntimeStatus({
      activationEndTime: 0,
      activationEvent: activationEvent,
      activationStartTime: performance.now(),
      activationTime: 0,
      id: extensionId,
      importEndTime: 0,
      importStartTime: startTime,
      importTime: 0,
      status: RuntimeStatusType.Importing,
    })
    try {
      await extensionHost.invoke('ExtensionHost.importExtension2', extensionId, absolutePath)
      const endTime = performance.now()
      const time = endTime - startTime
      ExtensionsState.updateRuntimeStatus(extensionId, {
        importEndTime: endTime,
        importTime: time,
      })
    } catch (error) {
      let importError = error
      if (IsImportError.isImportError(error)) {
        const actualErrorMessage = await TryToGetActualImportErrorMessage.tryToGetActualImportErrorMessage(absolutePath, error)
        importError = new Error(actualErrorMessage, { cause: error })
      }
      ExtensionsState.updateRuntimeStatus(extensionId, {
        error: getErrorMessage(importError),
        status: RuntimeStatusType.Error,
      })
      throw importError
    }
  } catch (error) {
    throw new VError(error, `Failed to import extension ${extensionId}`)
  }
}
