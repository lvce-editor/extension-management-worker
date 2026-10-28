/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import * as Assert from '@lvce-editor/assert'
import { PlatformType } from '@lvce-editor/constants'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import * as ExtensionsStateModule from '../ExtensionsState/ExtensionsState.ts'
import { getExtensionEnablement } from '../GetExtensionEnablement/GetExtensionEnablement.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'
import { getWebExtensions } from '../GetWebExtensions/GetWebExtensions.ts'
import { canRunOnRemote, isExtensionCompatible } from '../IsExtensionCompatible/IsExtensionCompatible.ts'
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

const getSharedProcessExtensions = (extensionsState: ExtensionsState, fields?: readonly string[]): Promise<readonly any[]> => {
  const current = ExtensionsStateModule.get(extensionsState.applicationId)
  const requestedFields = fields === undefined ? undefined : [...new Set([...fields, 'id', 'disabled'])]
  const cached = current.cachedExtensions
  if (cached) {
    const cachedFields = cached.fields
    if (cachedFields === undefined || (requestedFields !== undefined && requestedFields.every((field) => cachedFields.includes(field)))) {
      return cached.extensions
    }
  }
  const extensions = Promise.try(() =>
    requestedFields === undefined
      ? SharedProcess.invoke('ExtensionManagement.getAllExtensions')
      : SharedProcess.invoke('ExtensionManagement.getAllExtensions', requestedFields),
  )
  ExtensionsStateModule.update({ cachedExtensions: { extensions, fields: requestedFields } }, extensionsState.applicationId)
  void extensions.catch(() => {
    try {
      ExtensionsStateModule.clearCachedExtensions(extensionsState.applicationId, extensions)
    } catch {
      // The application may have been disposed while discovery was pending.
    }
  })
  return extensions
}

// Filter static contributions only; effective enablement must still be resolved.
type ManifestFilter = (extension: any) => boolean

const filterManifests = (extensions: readonly any[], matchesManifest: ManifestFilter | undefined): readonly any[] => {
  return matchesManifest === undefined ? extensions : extensions.filter(matchesManifest)
}

const getLocalExtensionsWithState = async (
  extensionsState: ExtensionsState,
  platform: number,
  fields: readonly string[] | undefined,
  matchesManifest: ManifestFilter | undefined,
): Promise<readonly any[]> => {
  const local = await getSharedProcessExtensions(extensionsState, fields)
  const candidates = [...local, ...extensionsState.webExtensions]
  // Application overlays must be resolved before filtering duplicate ids.
  const matchingCandidates = extensionsState.applicationId === undefined ? filterManifests(candidates, matchesManifest) : candidates
  return getExtensionsWithState(matchingCandidates, extensionsState, platform)
}

export const getAllExtensionsWithState = async (
  extensionsState: ExtensionsState,
  assetDir: string,
  platform: number,
  fields?: readonly string[],
  matchesManifest?: ManifestFilter,
) => {
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
    const cache = ExtensionsStateModule.getOrCreateWebExtensionsCache(extensionsState)
    const webExtensions = await getWebExtensions(resolvedAssetDir, cache)
    const candidates = await getExtensionsWithState([...webExtensions, ...meta], extensionsState, resolvedPlatform)
    let hasWorkspaceTransport = false
    if (candidates.some((extension) => !isExtensionCompatible(extension, resolvedPlatform) && canRunOnRemote(extension))) {
      const uri =
        extensionsState.applicationId === undefined
          ? await RendererWorker.invoke('Workspace.getUri')
          : await RendererWorker.invoke('Application.execute', extensionsState.applicationId, 'Workspace.getUri')
      if (typeof uri === 'string' && URL.canParse(uri)) {
        const scheme = new URL(uri).protocol.slice(0, -1)
        hasWorkspaceTransport = candidates.some(
          (extension) => !extension.disabled && extension.isolated === true && extension.workspaceTransport?.scheme === scheme,
        )
      }
    }
    extensions = candidates.filter((extension) => isExtensionCompatible(extension, resolvedPlatform, hasWorkspaceTransport))
  } else {
    extensions = await getLocalExtensionsWithState(extensionsState, resolvedPlatform, fields, matchesManifest)
  }
  // Web discovery must retain unrelated workspace transport extensions until
  // compatibility has been determined; application overlays are resolved above.
  extensions = filterManifests(extensions, matchesManifest)
  if (fields === undefined) {
    return extensions
  }
  return extensions.map((extension) =>
    Object.fromEntries(fields.filter((field) => Object.hasOwn(extension, field)).map((field) => [field, extension[field]])),
  )
}
