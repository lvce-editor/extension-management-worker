import type { Rpc } from '@lvce-editor/rpc'
import { getExtensionAbsolutePath } from '../GetExtensionAbsolutePath/GetExtensionAbsolutePath.ts'
import * as GetOrCreateIsolatedExtensionHostWorker from '../GetOrCreateIsolatedExtensionHostWorker/GetOrCreateIsolatedExtensionHostWorker.ts'
import { getOrigin } from '../GetOrigin/GetOrigin.ts'
import { interExtensionId } from '../InferExtensionId/InferExtensionId.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

export interface ExtensionManifest {
  readonly browser?: string
  readonly builtin?: boolean
  readonly id?: string
  readonly isWeb?: boolean
  readonly path?: string
  readonly uri?: string
}

export const getExtensionId = (extension: ExtensionManifest): string => {
  return extension.id || interExtensionId(extension.uri || extension.path || '')
}

export const getAbsolutePath = (extension: ExtensionManifest, assetDir: string, platform: number): string => {
  return getExtensionAbsolutePath(
    getExtensionId(extension),
    extension.isWeb === true,
    extension.builtin === true,
    extension.path || extension.uri || '',
    extension.browser || '',
    getOrigin(),
    platform,
    assetDir,
  )
}

export const getRpc = async (extension: ExtensionManifest, assetDir: string, platform: number): Promise<Rpc> => {
  const extensionId = getExtensionId(extension)
  const existingRpc = IsolatedExtensionHostWorkerState.get(extensionId)
  if (existingRpc) {
    return existingRpc
  }
  const absolutePath = getAbsolutePath(extension, assetDir, platform)
  return GetOrCreateIsolatedExtensionHostWorker.getOrCreateIsolatedExtensionHostWorker(extensionId, absolutePath)
}
