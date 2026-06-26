/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import * as Assert from '@lvce-editor/assert'
import { PlatformType } from '@lvce-editor/constants'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import { getWebExtensions } from '../GetWebExtensions/GetWebExtensions.ts'
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

const getExtensionsWithWorkspaceState = async (extensions: readonly any[]): Promise<readonly any[]> => {
  if (extensions.length === 0) {
    return extensions
  }
  const workspaceDisabledIds = await WorkspaceDisabledExtensionsStorage.readDisabledExtensionIdsSafe()
  return withWorkspaceDisabledState(extensions, workspaceDisabledIds)
}

export const getAllExtensionsWithState = async (extensionsState: ExtensionsState, assetDir: string, platform: number) => {
  if (typeof assetDir !== 'string') {
    assetDir = await RendererWorker.invoke('Layout.getAssetDir')
  }
  if (!platform) {
    platform = await RendererWorker.invoke('Layout.getPlatform')
  }
  Assert.string(assetDir)
  Assert.number(platform)
  const meta = extensionsState.webExtensions
  if (platform === PlatformType.Web) {
    const webExtensions = await getWebExtensions(assetDir)
    return getExtensionsWithWorkspaceState([...webExtensions, ...meta])
  }
  const local = await SharedProcess.invoke('ExtensionManagement.getAllExtensions')
  return getExtensionsWithWorkspaceState([...local, ...meta])
}
