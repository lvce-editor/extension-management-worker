import { PlatformType } from '@lvce-editor/constants'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import * as CacheStorage from '../CacheStorage/CacheStorage.ts'
import * as DisabledExtensionsCacheKey from '../DisabledExtensionsCacheKey/DisabledExtensionsCacheKey.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'

const getStringArray = (value: any): readonly string[] => {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((id): id is string => typeof id === 'string')
}

export const disableExtension2 = async (id: string, platform: number): Promise<void> => {
  const isTest = platform === PlatformType.Test
  const isWeb = platform === PlatformType.Web
  const oldState = ExtensionsState.get() // TODO maybe pass in an application id? Would allow multiple editors with different extensions.
  if (isTest) {
    const newState: ExtensionsState.ExtensionsState = {
      ...oldState,
      disabledIds: [...oldState.disabledIds, id],
    }
    ExtensionsState.set(newState)
  } else if (isWeb) {
    const cached = await CacheStorage.getJson(DisabledExtensionsCacheKey.disabledExtensionsCacheKey)
    const oldDisabled = getStringArray(cached?.disabledExtensions)
    const oldEnabled = getStringArray(cached?.enabledExtensions)
    const newDisabled = oldDisabled.includes(id) ? oldDisabled : [...oldDisabled, id]
    const newEnabled = oldEnabled.filter((existing) => existing !== id)
    const newData = {
      disabledExtensions: newDisabled,
      enabledExtensions: newEnabled,
    }
    await CacheStorage.setJson(DisabledExtensionsCacheKey.disabledExtensionsCacheKey, newData)
  } else {
    await SharedProcess.invoke('ExtensionManagement.disable', id)
  }
}

export const enableExtension2 = async (id: string, platform: number): Promise<void> => {
  const isTest = platform === PlatformType.Test
  const isWeb = platform === PlatformType.Web
  const oldState = ExtensionsState.get()
  if (isTest) {
    const newState: ExtensionsState.ExtensionsState = {
      ...oldState,
      disabledIds: oldState.disabledIds.filter((existing) => existing !== id),
    }
    ExtensionsState.set(newState)
  } else if (isWeb) {
    const cached = await CacheStorage.getJson(DisabledExtensionsCacheKey.disabledExtensionsCacheKey)
    const oldDisabled = getStringArray(cached?.disabledExtensions)
    const oldEnabled = getStringArray(cached?.enabledExtensions)
    const newDisabled = oldDisabled.filter((existing) => existing !== id)
    const newEnabled = oldEnabled.includes(id) ? oldEnabled : [...oldEnabled, id]
    const newData = {
      disabledExtensions: newDisabled,
      enabledExtensions: newEnabled,
    }
    await CacheStorage.setJson(DisabledExtensionsCacheKey.disabledExtensionsCacheKey, newData)
  } else {
    await SharedProcess.invoke('ExtensionManagement.enable', id)
  }
}
