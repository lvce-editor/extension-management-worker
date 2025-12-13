import { SharedProcess } from '@lvce-editor/rpc-registry'
import { invalidateExtensionsCache } from '../InvalidateExtensionsCache/InvalidateExtensionsCache.ts'
import * as State from '../State/State.ts'

export const enableExtension = async (id: string, isTest: boolean): Promise<void> => {
  try {
    if (isTest) {
      const oldState = State.get()
      const newState: State.State = {
        ...oldState,
        disabledIds: oldState.disabledIds.filter((existing) => existing !== id),
      }
      State.set(newState)
    } else {
      await SharedProcess.invoke(/* ExtensionManagement.enable */ 'ExtensionManagement.enable', /* id */ id)
    }
    await invalidateExtensionsCache()
    return undefined
  } catch (error) {
    return error
  }
}
