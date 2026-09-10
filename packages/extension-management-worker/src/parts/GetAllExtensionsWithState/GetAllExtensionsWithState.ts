/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import * as Assert from '@lvce-editor/assert'
import { PlatformType } from '@lvce-editor/constants'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import { getExtensionEnablement } from '../GetExtensionEnablement/GetExtensionEnablement.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'
import { getWebExtensions } from '../GetWebExtensions/GetWebExtensions.ts'
import { isExtensionCompatible } from '../IsExtensionCompatible/IsExtensionCompatible.ts'
import * as WorkspaceExtensionEnablementStorage from '../WorkspaceExtensionEnablementStorage/WorkspaceExtensionEnablementStorage.ts'

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
  if (extensionsState.applicationId !== undefined) {
    const byId = new Map(extensions.map((extension) => [extension.id, extension]))
    return withDisabledState(byId.values().toArray(), extensionsState.disabledIds).map((extension) => ({
      ...extension,
      applicationGeneration: extensionsState.applicationGeneration,
      applicationId: extensionsState.applicationId,
    }))
  }
  if (extensions.length === 0) {
    return extensions
  }
  const { disabledIds, enabledIds } = await getExtensionEnablement(extensionsState, platform)
  const extensionsWithDisabledState = withDisabledState(extensions, disabledIds, enabledIds)
  if (platform === PlatformType.Test) {
    return extensionsWithDisabledState
  }
  const { disabledIds: workspaceDisabledIds, enabledIds: workspaceEnabledIds } =
    await WorkspaceExtensionEnablementStorage.getWorkspaceExtensionEnablementSafe()
  return withDisabledState(extensionsWithDisabledState, workspaceDisabledIds, workspaceEnabledIds)
}

export const getAllExtensionsWithState = async (extensionsState: ExtensionsState, assetDir: string, platform: number, fields?: readonly string[]) => {
  const { assetDir: resolvedAssetDir, platform: resolvedPlatform } = await getRuntimeContext(assetDir, platform)
  Assert.string(resolvedAssetDir)
  Assert.number(resolvedPlatform)
  if (fields !== undefined) {
    Assert.array(fields)
    for (const field of fields) {
      Assert.string(field)
    }
  }
  const meta = extensionsState.webExtensions
  let extensions: readonly any[]
  if (resolvedPlatform === PlatformType.Web) {
    const webExtensions = await getWebExtensions(resolvedAssetDir)
    const compatibleExtensions = [...webExtensions, ...meta].filter((extension) => isExtensionCompatible(extension, resolvedPlatform))
    extensions = await getExtensionsWithState(compatibleExtensions, extensionsState, resolvedPlatform)
  } else {
    const local = await SharedProcess.invoke('ExtensionManagement.getAllExtensions')
    extensions = await getExtensionsWithState([...local, ...meta], extensionsState, resolvedPlatform)
  }
  if (fields === undefined) {
    return extensions
  }
  return extensions.map((extension) =>
    Object.fromEntries(fields.filter((field) => Object.hasOwn(extension, field)).map((field) => [field, extension[field]])),
  )
}
