/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import type { ExtensionManifest as RpcExtensionManifest } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import { getAllExtensionsWithState } from '../GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import { getRpc } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'

interface FileSystemProviderContribution {
  readonly id?: string
}

interface ExtensionManifest extends RpcExtensionManifest {
  readonly disabled?: boolean
  readonly fileSystemProviders?: readonly FileSystemProviderContribution[]
}

export interface FileSystemProviderResult {
  readonly found: boolean
  readonly result?: unknown
}

const getProviderIds = (extension: ExtensionManifest): readonly string[] => {
  if (!Array.isArray(extension.fileSystemProviders)) {
    return []
  }
  return extension.fileSystemProviders.map((provider) => provider.id).filter((id): id is string => typeof id === 'string')
}

const findExtension = (extensions: readonly ExtensionManifest[], providerId: string): ExtensionManifest | undefined => {
  return extensions.find((extension) => getProviderIds(extension).includes(providerId))
}

const executeFileSystemProviderMethod = async (
  extensionsState: ExtensionsState,
  method: string,
  providerId: string,
  ...args: readonly unknown[]
): Promise<FileSystemProviderResult> => {
  const { assetDir, platform } = await getRuntimeContext('', extensionsState.platform)
  const extensions = await getAllExtensionsWithState(extensionsState, assetDir, platform)
  const extension = findExtension(
    extensions.filter((candidate) => !candidate.disabled && IsExtensionIsolated.isExtensionIsolated(candidate)),
    providerId,
  )
  if (!extension) {
    return { found: false }
  }
  const rpc = await getRpc(extension, assetDir, platform)
  const result = await rpc.invoke(method, providerId, ...args)
  return { found: true, result }
}

export const executeFileSystemProviderGetPathSeparator = (
  extensionsState: ExtensionsState,
  providerId: string,
): Promise<FileSystemProviderResult> => {
  return executeFileSystemProviderMethod(extensionsState, 'ExtensionApi.executeFileSystemProviderGetPathSeparator', providerId)
}

export const executeFileSystemProviderIsReadonly = (extensionsState: ExtensionsState, providerId: string): Promise<FileSystemProviderResult> => {
  return executeFileSystemProviderMethod(extensionsState, 'ExtensionApi.executeFileSystemProviderIsReadonly', providerId)
}

export const executeFileSystemProviderMkdir = (
  extensionsState: ExtensionsState,
  providerId: string,
  uri: string,
): Promise<FileSystemProviderResult> => {
  return executeFileSystemProviderMethod(extensionsState, 'ExtensionApi.executeFileSystemProviderMkdir', providerId, uri)
}

export const executeFileSystemProviderReadDirWithFileTypes = (
  extensionsState: ExtensionsState,
  providerId: string,
  uri: string,
): Promise<FileSystemProviderResult> => {
  return executeFileSystemProviderMethod(extensionsState, 'ExtensionApi.executeFileSystemProviderReadDirWithFileTypes', providerId, uri)
}

export const executeFileSystemProviderReadFile = (
  extensionsState: ExtensionsState,
  providerId: string,
  uri: string,
): Promise<FileSystemProviderResult> => {
  return executeFileSystemProviderMethod(extensionsState, 'ExtensionApi.executeFileSystemProviderReadFile', providerId, uri)
}

export const executeFileSystemProviderRemove = (
  extensionsState: ExtensionsState,
  providerId: string,
  uri: string,
): Promise<FileSystemProviderResult> => {
  return executeFileSystemProviderMethod(extensionsState, 'ExtensionApi.executeFileSystemProviderRemove', providerId, uri)
}

export const executeFileSystemProviderRename = (
  extensionsState: ExtensionsState,
  providerId: string,
  oldUri: string,
  newUri: string,
): Promise<FileSystemProviderResult> => {
  return executeFileSystemProviderMethod(extensionsState, 'ExtensionApi.executeFileSystemProviderRename', providerId, oldUri, newUri)
}

export const executeFileSystemProviderWriteFile = (
  extensionsState: ExtensionsState,
  providerId: string,
  uri: string,
  content: string,
): Promise<FileSystemProviderResult> => {
  return executeFileSystemProviderMethod(extensionsState, 'ExtensionApi.executeFileSystemProviderWriteFile', providerId, uri, content)
}
