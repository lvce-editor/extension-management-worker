import { PlatformType } from '@lvce-editor/constants'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import * as State from '../State/State.ts'

export const disableextension2 = async (id: string, platform: number): Promise<void> => {
  const isTest = platform === PlatformType.Test
  const oldState = State.get() // TODO maybe pass in an application id? Would allow multiple editors with different extensions.
  if (isTest) {
    const newState: State.State = {
      ...oldState,
      disabledIds: [...oldState.disabledIds, id],
    }
    State.set(newState)
  } else {
    await SharedProcess.invoke('ExtensionManagement.disable', id)
  }
}

export const enableextension2 = async (id: string, platform: number): Promise<void> => {
  const isTest = platform === PlatformType.Test
  const oldState = State.get()
  if (isTest) {
    const newState: State.State = {
      ...oldState,
      disabledIds: oldState.disabledIds.filter((existing) => existing !== id),
    }
    State.set(newState)
  }
}
