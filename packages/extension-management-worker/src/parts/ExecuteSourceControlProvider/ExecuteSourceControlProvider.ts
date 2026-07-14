/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { Rpc } from '@lvce-editor/rpc'
import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import type { ExtensionManifest as RpcExtensionManifest } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import { getAllExtensionsWithState } from '../GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import { getRpc } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'

interface SourceControlProviderContribution {
  readonly id?: string
}

interface ExtensionManifest extends RpcExtensionManifest {
  readonly disabled?: boolean
  readonly sourceControlProviders?: readonly SourceControlProviderContribution[]
}

export interface SourceControlProviderResult {
  readonly found: boolean
  readonly result?: unknown
}

const getProviderIds = (extension: ExtensionManifest): readonly string[] => {
  if (!Array.isArray(extension.sourceControlProviders)) {
    return []
  }
  return extension.sourceControlProviders.map((provider) => provider.id).filter((id): id is string => typeof id === 'string')
}

const getMatchingExtensions = async (extensionsState: ExtensionsState, assetDir: string, platform: number): Promise<readonly ExtensionManifest[]> => {
  const extensions = await getAllExtensionsWithState(extensionsState, assetDir, platform)
  return extensions.filter(
    (extension): boolean => !extension.disabled && IsExtensionIsolated.isExtensionIsolated(extension) && getProviderIds(extension).length > 0,
  )
}

const findExtension = (extensions: readonly ExtensionManifest[], providerId: string): ExtensionManifest | undefined => {
  return extensions.find((extension) => getProviderIds(extension).includes(providerId))
}

const isProviderActive = async (rpc: Rpc, providerId: string, scheme: string, root: string): Promise<boolean> => {
  return rpc.invoke('ExtensionApi.executeSourceControlIsActive', providerId, scheme, root)
}

export const getEnabledSourceControlProviderIds = async (
  extensionsState: ExtensionsState,
  scheme: string,
  root: string,
): Promise<readonly string[]> => {
  const { assetDir, platform } = await getRuntimeContext('', extensionsState.platform)
  const extensions = await getMatchingExtensions(extensionsState, assetDir, platform)
  const enabledProviderIds: string[] = []
  for (const extension of extensions) {
    const rpc = await getRpc(extension, assetDir, platform)
    for (const providerId of getProviderIds(extension)) {
      if (await isProviderActive(rpc, providerId, scheme, root)) {
        enabledProviderIds.push(providerId)
      }
    }
  }
  return enabledProviderIds
}

export const executeSourceControlProvider = async (
  extensionsState: ExtensionsState,
  providerId: string,
  methodName: string,
  ...args: readonly unknown[]
): Promise<SourceControlProviderResult> => {
  const { assetDir, platform } = await getRuntimeContext('', extensionsState.platform)
  const extensions = await getMatchingExtensions(extensionsState, assetDir, platform)
  const extension = findExtension(extensions, providerId)
  if (!extension) {
    return { found: false }
  }
  const rpc = await getRpc(extension, assetDir, platform)
  const result = await rpc.invoke(`ExtensionApi.${methodName}`, providerId, ...args)
  return { found: true, result }
}
