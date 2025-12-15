import * as Assert from '@lvce-editor/assert'
import { ExtensionHost } from '@lvce-editor/rpc-registry'
import { VError } from '@lvce-editor/verror'
import * as IsImportError from '../IsImportError/IsImportError.ts'
import * as RuntimeStatusState from '../RuntimeStatusState/RuntimeStatusState.ts'
import * as RuntimeStatusType from '../RuntimeStatusType/RuntimeStatusType.ts'
import * as TryToGetActualImportErrorMessage from '../TryToGetActualImportErrorMessage/TryToGetActualImportErrorMessage.ts'

export const importExtension = async (extensionId: string, absolutePath: string, activationEvent: string) => {
  try {
    Assert.string(absolutePath)
    const startTime = performance.now()
    RuntimeStatusState.set({
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
      await ExtensionHost.invoke('ExtneionHost.importExtension2', extensionId, absolutePath)
      const endTime = performance.now()
      const time = endTime - startTime
      RuntimeStatusState.update(extensionId, {
        importEndTime: endTime,
        importTime: time,
      })
    } catch (error) {
      RuntimeStatusState.update(extensionId, {
        status: RuntimeStatusType.Error, // TODO maybe store error also in runtime status state
      })
      if (IsImportError.isImportError(error)) {
        const actualErrorMessage = await TryToGetActualImportErrorMessage.tryToGetActualImportErrorMessage(absolutePath, error)
        throw new Error(actualErrorMessage)
      }
      throw error
    }
  } catch (error) {
    throw new VError(error, `Failed to import extension ${extensionId}`)
  }
}
