/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import { PlatformType } from '@lvce-editor/constants'
import { FileSystemWorker, RendererWorker } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import * as CacheStorage from '../CacheStorage/CacheStorage.ts'
import * as DisabledExtensionsCacheKey from '../DisabledExtensionsCacheKey/DisabledExtensionsCacheKey.ts'

const getDisabledExtensionIdsFromData = (data: any): readonly string[] => {
  const disabledExtensions = data?.disabledExtensions
  if (!Array.isArray(disabledExtensions)) {
    return []
  }
  return disabledExtensions.filter((id): id is string => typeof id === 'string')
}

const getWebDisabledExtensionIds = async (): Promise<readonly string[]> => {
  try {
    const cached = await CacheStorage.getJson(DisabledExtensionsCacheKey.disabledExtensionsCacheKey)
    return getDisabledExtensionIdsFromData(cached)
  } catch {
    return []
  }
}

const getRemoteDisabledExtensionIds = async (): Promise<readonly string[]> => {
  try {
    const uri = await RendererWorker.invoke('WebView.compatSharedProcessInvoke', 'PlatformPaths.getDisabledExtensionsJsonUri')
    const exists = await FileSystemWorker.exists(uri)
    if (!exists) {
      return []
    }
    const content = await FileSystemWorker.readFile(uri)
    const parsed = JSON.parse(content)
    return getDisabledExtensionIdsFromData(parsed)
  } catch {
    return []
  }
}

export const getDisabledExtensionIds = async (extensionsState: ExtensionsState, platform: number): Promise<readonly string[]> => {
  if (platform === PlatformType.Test) {
    return extensionsState.disabledIds
  }
  if (platform === PlatformType.Web) {
    return getWebDisabledExtensionIds()
  }
  if (platform === PlatformType.Remote || platform === PlatformType.Electron) {
    return getRemoteDisabledExtensionIds()
  }
  return []
}
