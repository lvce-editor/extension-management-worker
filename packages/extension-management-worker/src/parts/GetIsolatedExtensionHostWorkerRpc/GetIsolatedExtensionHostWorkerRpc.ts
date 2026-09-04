import type { Rpc } from '@lvce-editor/rpc'
import { activateIsolatedExtension } from '../ActivateIsolatedExtension/ActivateIsolatedExtension.ts'
import { getContentSecurityPolicy } from '../GetContentSecurityPolicy/GetContentSecurityPolicy.ts'
import { getExtensionAbsolutePath } from '../GetExtensionAbsolutePath/GetExtensionAbsolutePath.ts'
import * as GetOrCreateIsolatedExtensionHostWorker from '../GetOrCreateIsolatedExtensionHostWorker/GetOrCreateIsolatedExtensionHostWorker.ts'
import { getOrigin } from '../GetOrigin/GetOrigin.ts'
import * as HandleRpcInfos from '../HandleRpcInfos/HandleRpcInfos.ts'
import { interExtensionId } from '../InferExtensionId/InferExtensionId.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'
import { notifyRunningExtensionsChanged } from '../NotifyRunningExtensionsChanged/NotifyRunningExtensionsChanged.ts'

type GetOrCreate = typeof GetOrCreateIsolatedExtensionHostWorker.getOrCreateIsolatedExtensionHostWorker
type NotifyRunningExtensionsChanged = typeof notifyRunningExtensionsChanged

export interface ExtensionManifest {
  readonly browser?: string
  readonly builtin?: boolean
  readonly contentSecurityPolicy?: readonly string[]
  readonly id?: string
  readonly isWeb?: boolean
  readonly path?: string
  readonly rpc?: readonly unknown[]
  readonly uri?: string
  readonly workerName?: string
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

export const getRpc = async (
  extension: ExtensionManifest,
  assetDir: string,
  platform: number,
  activationEvent = '',
  getOrCreate: GetOrCreate = GetOrCreateIsolatedExtensionHostWorker.getOrCreateIsolatedExtensionHostWorker,
  notify: NotifyRunningExtensionsChanged = notifyRunningExtensionsChanged,
): Promise<Rpc> => {
  const extensionId = getExtensionId(extension)
  const existingRpc = IsolatedExtensionHostWorkerState.get(extensionId)
  if (existingRpc) {
    return existingRpc
  }
  HandleRpcInfos.handleRpcInfos(extension, platform)
  const absolutePath = getAbsolutePath(extension, assetDir, platform)
  const contentSecurityPolicy = getContentSecurityPolicy(extension.contentSecurityPolicy, absolutePath, extension.rpc)
  const rpc = await activateIsolatedExtension(
    extensionId,
    absolutePath,
    extension.workerName || '',
    contentSecurityPolicy,
    activationEvent,
    getOrCreate,
  )
  notify()
  return rpc
}
