import { PlatformType } from '@lvce-editor/constants'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import * as CacheStorage from '../CacheStorage/CacheStorage.ts'
import * as DisabledExtensionsCacheKey from '../DisabledExtensionsCacheKey/DisabledExtensionsCacheKey.ts'
import * as State from '../State/State.ts'

export const disableExtension2 = async (id: string, platform: number): Promise<void> => {
  const isTest = platform === PlatformType.Test
  const isWeb = platform === PlatformType.Web
  const oldState = State.get() // TODO maybe pass in an application id? Would allow multiple editors with different extensions.
  if (isTest) {
    const newState: State.State = {
      ...oldState,
      disabledIds: [...oldState.disabledIds, id],
    }
    State.set(newState)
  } else if (isWeb) {
    const cached = await CacheStorage.getJson(DisabledExtensionsCacheKey.disabledExtensionsCacheKey)
    const oldDisabled = cached?.disabledExtensions || []
    const newDisabled = [...oldDisabled, id]
    const newData = {
      disabledExtensions: newDisabled,
    }
    await CacheStorage.setJson(DisabledExtensionsCacheKey.disabledExtensionsCacheKey, newData)
  } else {
    await SharedProcess.invoke('ExtensionManagement.disable', id)
  }
}

export const enableExtension2 = async (id: string, platform: number): Promise<void> => {
  const isTest = platform === PlatformType.Test
  const isWeb = platform === PlatformType.Web
  const oldState = State.get()
  if (isTest) {
    const newState: State.State = {
      ...oldState,
      disabledIds: oldState.disabledIds.filter((existing) => existing !== id),
    }
    State.set(newState)
  } else if (isWeb) {
    const cached = await CacheStorage.getJson(DisabledExtensionsCacheKey.disabledExtensionsCacheKey)
    const oldDisabled = cached?.disabledExtensions || []
    const newDisabled = oldDisabled.filter((item: string) => item !== id)
    const newData = {
      disabledExtensions: newDisabled,
    }
    await CacheStorage.setJson(DisabledExtensionsCacheKey.disabledExtensionsCacheKey, newData)
  }
}
