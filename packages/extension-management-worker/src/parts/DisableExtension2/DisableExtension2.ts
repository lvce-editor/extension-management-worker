import * as Assert from '@lvce-editor/assert'
import { PlatformType } from '@lvce-editor/constants'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import { invalidateExtensionsCache } from '../InvalidateExtensionsCache/InvalidateExtensionsCache.ts'
import * as State from '../State/State.ts'

export const disableExtension2 = async (id: string, platform: number): Promise<unknown> => {
  Assert.string(id)
  Assert.number(platform)
  const isTest = platform === PlatformType.Test
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
