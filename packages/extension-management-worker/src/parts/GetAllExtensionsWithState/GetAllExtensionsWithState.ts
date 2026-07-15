/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import * as Assert from '@lvce-editor/assert'
import { PlatformType } from '@lvce-editor/constants'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'
import { getWebExtensions } from '../GetWebExtensions/GetWebExtensions.ts'
import { isExtensionCompatible } from '../IsExtensionCompatible/IsExtensionCompatible.ts'
import * as WorkspaceDisabledExtensionsStorage from '../WorkspaceDisabledExtensionsStorage/WorkspaceDisabledExtensionsStorage.ts'

const withWorkspaceDisabledState = (extensions: readonly any[], disabledIds: readonly string[]): readonly any[] => {
  if (disabledIds.length === 0) {
    return extensions
  }
  const disabledIdsSet = new Set(disabledIds)
  return extensions.map((extension) => {
    if (!disabledIdsSet.has(extension.id)) {
      return extension
    }
    return {
      ...extension,
      disabled: true,
    }
  })
}

const getExtensionsWithWorkspaceState = async (extensions: readonly any[], platform: number): Promise<readonly any[]> => {
  if (extensions.length === 0 || platform === PlatformType.Test) {
    return extensions
  }
  const workspaceDisabledIds = await WorkspaceDisabledExtensionsStorage.readDisabledExtensionIdsSafe()
  return withWorkspaceDisabledState(extensions, workspaceDisabledIds)
}

export const getAllExtensionsWithState = async (extensionsState: ExtensionsState, assetDir: string, platform: number) => {
  const { assetDir: resolvedAssetDir, platform: resolvedPlatform } = await getRuntimeContext(assetDir, platform)
  Assert.string(resolvedAssetDir)
  Assert.number(resolvedPlatform)
  const meta = extensionsState.webExtensions
  if (resolvedPlatform === PlatformType.Web) {
    const webExtensions = await getWebExtensions(resolvedAssetDir)
    const compatibleExtensions = [...webExtensions, ...meta].filter((extension) => isExtensionCompatible(extension, resolvedPlatform))
    return getExtensionsWithWorkspaceState(compatibleExtensions, resolvedPlatform)
  }
  const local = await SharedProcess.invoke('ExtensionManagement.getAllExtensions')
  return getExtensionsWithWorkspaceState([...local, ...meta], resolvedPlatform)
}
