/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import { PlatformType } from '@lvce-editor/constants'
import { FileSystemWorker, RendererWorker } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import * as CacheStorage from '../CacheStorage/CacheStorage.ts'
import * as DisabledExtensionsCacheKey from '../DisabledExtensionsCacheKey/DisabledExtensionsCacheKey.ts'

export interface ExtensionEnablement {
  readonly disabledIds: readonly string[]
  readonly enabledIds: readonly string[]
}

const getStringArray = (value: any): readonly string[] => {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((id): id is string => typeof id === 'string')
}

const getExtensionEnablementFromData = (data: any): ExtensionEnablement => {
  return {
    disabledIds: getStringArray(data?.disabledExtensions),
    enabledIds: getStringArray(data?.enabledExtensions),
  }
}

const getWebExtensionEnablement = async (): Promise<ExtensionEnablement> => {
  try {
    const cached = await CacheStorage.getJson(DisabledExtensionsCacheKey.disabledExtensionsCacheKey)
    return getExtensionEnablementFromData(cached)
  } catch {
    return getExtensionEnablementFromData(undefined)
  }
}

const getRemoteExtensionEnablement = async (): Promise<ExtensionEnablement> => {
  try {
    const uri = await RendererWorker.invoke('WebView.compatSharedProcessInvoke', 'PlatformPaths.getDisabledExtensionsJsonUri')
    const exists = await FileSystemWorker.exists(uri)
    if (!exists) {
      return getExtensionEnablementFromData(undefined)
    }
    const content = await FileSystemWorker.readFile(uri)
    return getExtensionEnablementFromData(JSON.parse(content))
  } catch {
    return getExtensionEnablementFromData(undefined)
  }
}

export const getExtensionEnablement = async (extensionsState: ExtensionsState, platform: number): Promise<ExtensionEnablement> => {
  if (platform === PlatformType.Test) {
    return {
      disabledIds: extensionsState.disabledIds,
      enabledIds: [],
    }
  }
  if (platform === PlatformType.Web) {
    return getWebExtensionEnablement()
  }
  if (platform === PlatformType.Remote || platform === PlatformType.Electron) {
    return getRemoteExtensionEnablement()
  }
  return getExtensionEnablementFromData(undefined)
}
