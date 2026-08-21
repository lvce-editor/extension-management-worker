/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import * as Assert from '@lvce-editor/assert'
import { PlatformType } from '@lvce-editor/constants'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import { getExtensionEnablement } from '../GetExtensionEnablement/GetExtensionEnablement.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'
import { getWebExtensions } from '../GetWebExtensions/GetWebExtensions.ts'
import { isExtensionCompatible } from '../IsExtensionCompatible/IsExtensionCompatible.ts'
import * as WorkspaceDisabledExtensionsStorage from '../WorkspaceDisabledExtensionsStorage/WorkspaceDisabledExtensionsStorage.ts'

const withDisabledState = (extensions: readonly any[], disabledIds: readonly string[], enabledIds: readonly string[] = []): readonly any[] => {
  if (disabledIds.length === 0 && enabledIds.length === 0) {
    return extensions
  }
  const disabledIdsSet = new Set(disabledIds)
  const enabledIdsSet = new Set(enabledIds)
  return extensions.map((extension) => {
    if (disabledIdsSet.has(extension.id)) {
      return {
        ...extension,
        disabled: true,
      }
    }
    if (enabledIdsSet.has(extension.id) && extension.disabled === true) {
      return {
        ...extension,
        disabled: false,
      }
    }
    return extension
  })
}

const getExtensionsWithState = async (extensions: readonly any[], extensionsState: ExtensionsState, platform: number): Promise<readonly any[]> => {
  if (extensions.length === 0) {
    return extensions
  }
  const { disabledIds, enabledIds } = await getExtensionEnablement(extensionsState, platform)
  const extensionsWithDisabledState = withDisabledState(extensions, disabledIds, enabledIds)
  if (platform === PlatformType.Test || platform === PlatformType.Web) {
    return extensionsWithDisabledState
  }
  const workspaceDisabledIds = await WorkspaceDisabledExtensionsStorage.readDisabledExtensionIdsSafe()
  return withDisabledState(extensionsWithDisabledState, workspaceDisabledIds)
}

export const getAllExtensionsWithState = async (extensionsState: ExtensionsState, assetDir: string, platform: number) => {
  const { assetDir: resolvedAssetDir, platform: resolvedPlatform } = await getRuntimeContext(assetDir, platform)
  Assert.string(resolvedAssetDir)
  Assert.number(resolvedPlatform)
  const meta = extensionsState.webExtensions
  if (resolvedPlatform === PlatformType.Web) {
    const webExtensions = await getWebExtensions(resolvedAssetDir)
    const compatibleExtensions = [...webExtensions, ...meta].filter((extension) => isExtensionCompatible(extension, resolvedPlatform))
    return getExtensionsWithState(compatibleExtensions, extensionsState, resolvedPlatform)
  }
  const local = await SharedProcess.invoke('ExtensionManagement.getAllExtensions')
  return getExtensionsWithState([...local, ...meta], extensionsState, resolvedPlatform)
}
