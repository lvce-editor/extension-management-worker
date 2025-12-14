import { SharedProcess } from '@lvce-editor/rpc-registry'
import { invalidateExtensionsCache } from '../InvalidateExtensionsCache/InvalidateExtensionsCache.ts'
import * as State from '../State/State.ts'

export const disableExtension = async (id: string, isTest: boolean): Promise<unknown> => {
  const oldState = State.get()
  try {
    if (isTest) {
      const newState: State.State = {
        ...oldState,
        disabledIds: [...oldState.disabledIds, id],
      }
      State.set(newState)
    } else {
      await SharedProcess.invoke('ExtensionManagement.disable', id)
    }
    await invalidateExtensionsCache()
    return undefined
  } catch (error) {
    return error
  }
}
