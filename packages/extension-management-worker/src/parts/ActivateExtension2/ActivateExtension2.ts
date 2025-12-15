import { VError } from '@lvce-editor/verror'
import * as CancelToken from '../CancelToken/CancelToken.ts'
import * as GetExtensionId from '../GetExtensionId/GetExtensionId.ts'
import * as IsImportError from '../IsImportError/IsImportError.ts'
import * as RuntimeStatusState from '../RuntimeStatusState/RuntimeStatusState.ts'
import * as RuntimeStatusType from '../RuntimeStatusType/RuntimeStatusType.ts'
import * as Timeout from '../Timeout/Timeout.ts'
import * as TryToGetActualImportErrorMessage from '../TryToGetActualImportErrorMessage/TryToGetActualImportErrorMessage.ts'

// TODO make activation timeout configurable or remove it.
// some extension might do workspace indexing which could take some time
const activationTimeout = 10_000

const rejectAfterTimeout = async (timeout: number, token: any): Promise<void> => {
  await Timeout.sleep(timeout)
  if (CancelToken.isCanceled(token)) {
    return
  }
  throw new Error(`Activation timeout of ${timeout}ms exceeded`)
}

const activate = async (extension: any) => {}

export const activateExtension2 = async (extensionId: string, extension: any, absolutePath: string) => {
  const token = CancelToken.create()
  try {
    const startTime = performance.now()
    RuntimeStatusState.update(extensionId, {
      activationStartTime: startTime,
      status: RuntimeStatusType.Activating,
    })
    await Promise.race([activate(extension), rejectAfterTimeout(activationTimeout, token)])
    const endTime = performance.now()
    const time = endTime - startTime
    RuntimeStatusState.update(extensionId, {
      activationEndTime: endTime,
      activationTime: time,
      status: RuntimeStatusType.Activated,
    })
  } catch (error) {
    const id = GetExtensionId.getExtensionId(extension)
    if (IsImportError.isImportError(error)) {
      const actualErrorMessage = await TryToGetActualImportErrorMessage.tryToGetActualImportErrorMessage(absolutePath, error)
      throw new Error(`Failed to activate extension ${id}: ${actualErrorMessage}`)
    }
    RuntimeStatusState.update(extensionId, {
      status: RuntimeStatusType.Error, // TODO maybe store error also in runtime status state
    })

    throw new VError(error, `Failed to activate extension ${id}`)
  } finally {
    CancelToken.cancel(token)
  }
}
