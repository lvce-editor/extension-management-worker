/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import { getAllExtensionsWithState } from '../GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import { getExtensionId, getRpc } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'

const protocol = 'extension-output://'

interface OutputChannelContribution {
  readonly id?: string
  readonly label?: string
}

interface ExtensionManifest {
  readonly disabled?: boolean
  readonly id?: string
  readonly isolated?: boolean
  readonly outputChannels?: readonly OutputChannelContribution[]
}

interface RegisteredOutputChannel {
  readonly id?: string
}

interface OutputChannelRegistrySnapshot {
  readonly outputChannels?: readonly RegisteredOutputChannel[]
}

export interface OutputChannelProvider {
  readonly id: string
  readonly label: string
  readonly uri: string
}

const hasOutputChannels = (extension: ExtensionManifest): boolean => {
  return (
    !extension.disabled &&
    IsExtensionIsolated.isExtensionIsolated(extension) &&
    Array.isArray(extension.outputChannels) &&
    extension.outputChannels.length > 0
  )
}

const getOutputChannelUri = (extensionId: string, outputChannelId: string): string => {
  return `${protocol}${encodeURIComponent(extensionId)}/${encodeURIComponent(outputChannelId)}`
}

const getRegisteredOutputChannelIds = (snapshot: OutputChannelRegistrySnapshot): ReadonlySet<string> => {
  if (!snapshot || !Array.isArray(snapshot.outputChannels)) {
    return new Set()
  }
  return new Set(snapshot.outputChannels.map((outputChannel) => outputChannel.id).filter((id): id is string => typeof id === 'string'))
}

const getExtensionOutputChannelProviders = async (
  extension: ExtensionManifest,
  assetDir: string,
  platform: number,
): Promise<readonly OutputChannelProvider[]> => {
  const extensionId = getExtensionId(extension)
  const rpc = await getRpc(extension, assetDir, platform)
  const snapshot = await rpc.invoke('ExtensionApi.getOutputChannelRegistrySnapshot')
  const registeredIds = getRegisteredOutputChannelIds(snapshot)
  const outputChannels = extension.outputChannels || []
  return outputChannels
    .filter(
      (outputChannel): outputChannel is Required<OutputChannelContribution> =>
        typeof outputChannel.id === 'string' && typeof outputChannel.label === 'string' && registeredIds.has(outputChannel.id),
    )
    .map((outputChannel) => ({
      id: outputChannel.id,
      label: outputChannel.label,
      uri: getOutputChannelUri(extensionId, outputChannel.id),
    }))
}

export const getOutputChannelProviders = async (extensionsState: ExtensionsState): Promise<readonly OutputChannelProvider[]> => {
  const { assetDir, platform } = await getRuntimeContext('', extensionsState.platform)
  const extensions = await getAllExtensionsWithState(extensionsState, assetDir, platform)
  const outputExtensions = extensions.filter(hasOutputChannels)
  const providers = await Promise.all(outputExtensions.map((extension) => getExtensionOutputChannelProviders(extension, assetDir, platform)))
  return providers.flat()
}

const parseOutputChannelUri = (uri: string): readonly [extensionId: string, outputChannelId: string] => {
  if (!uri.startsWith(protocol)) {
    throw new Error(`Invalid extension output uri ${uri}`)
  }
  const value = uri.slice(protocol.length)
  const separatorIndex = value.indexOf('/')
  if (separatorIndex === -1) {
    throw new Error(`Invalid extension output uri ${uri}`)
  }
  const extensionId = decodeURIComponent(value.slice(0, separatorIndex))
  const outputChannelId = decodeURIComponent(value.slice(separatorIndex + 1))
  if (!extensionId || !outputChannelId) {
    throw new Error(`Invalid extension output uri ${uri}`)
  }
  return [extensionId, outputChannelId]
}

export const readOutputChannel = async (extensionsState: ExtensionsState, uri: string): Promise<string> => {
  const [extensionId, outputChannelId] = parseOutputChannelUri(uri)
  const { assetDir, platform } = await getRuntimeContext('', extensionsState.platform)
  const extensions = await getAllExtensionsWithState(extensionsState, assetDir, platform)
  const extension = extensions.find((candidate) => getExtensionId(candidate) === extensionId && hasOutputChannels(candidate))
  const isContributed = extension?.outputChannels?.some((outputChannel: OutputChannelContribution) => outputChannel.id === outputChannelId)
  if (!extension || !isContributed) {
    throw new Error(`Output channel ${outputChannelId} is not contributed by extension ${extensionId}`)
  }
  const rpc = await getRpc(extension, assetDir, platform)
  const logs = await rpc.invoke('ExtensionApi.getOutputChannelLogs', outputChannelId)
  if (typeof logs !== 'string') {
    throw new TypeError(`Output channel ${outputChannelId} is not registered by extension ${extensionId}`)
  }
  return logs
}
