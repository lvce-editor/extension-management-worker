import type { Rpc } from '@lvce-editor/rpc'
import * as ActivateByEvent from '../ActivateByEvent/ActivateByEvent.ts'
import * as ExtensionViewInstanceState from '../ExtensionViewInstanceState/ExtensionViewInstanceState.ts'
import * as GetExtensions from '../GetExtensions/GetExtensions.ts'
import {
  getExtensionId,
  getRpc,
  type ExtensionManifest as RpcExtensionManifest,
} from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

interface ManifestView {
  readonly id?: string
}

interface ExtensionManifest extends RpcExtensionManifest {
  readonly views?: readonly ManifestView[]
}

interface CreateViewInstanceSuccess {
  readonly ok: true
  readonly result: unknown
}

interface CreateViewInstanceError {
  readonly error: ExtensionViewInstanceState.SerializedError
  readonly ok: false
}

type CreateViewInstanceResult = CreateViewInstanceSuccess | CreateViewInstanceError

const serializeError = (error: unknown): ExtensionViewInstanceState.SerializedError => {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      ...(error.stack && { stack: error.stack }),
    }
  }
  return {
    message: String(error),
    name: 'Error',
  }
}

const hasView = (extension: ExtensionManifest, viewId: string): boolean => {
  return Array.isArray(extension.views) && extension.views.some((view) => view.id === viewId)
}

const getExtensionForView = async (viewId: string, assetDir: string, platform: number): Promise<ExtensionManifest> => {
  const extensions = await GetExtensions.getAllExtensions(assetDir, platform)
  const extension = extensions.find((extension) => IsExtensionIsolated.isExtensionIsolated(extension) && hasView(extension, viewId))
  if (!extension) {
    throw new Error(`view ${viewId} not found`)
  }
  return extension
}

const getRpcForView = async (viewId: string, assetDir: string, platform: number): Promise<Rpc> => {
  const extension = await getExtensionForView(viewId, assetDir, platform)
  const existingRpc = IsolatedExtensionHostWorkerState.get(getExtensionId(extension))
  if (existingRpc) {
    return existingRpc
  }
  const activationResult = await ActivateByEvent.activateByEvent(`onView:${viewId}`, assetDir, platform)
  if (activationResult.error) {
    throw activationResult.error
  }
  return getRpc(extension, assetDir, platform)
}

const getRpcForInstance = async (viewId: string, uid: number, assetDir: string, platform: number): Promise<Rpc | undefined> => {
  const instance = ExtensionViewInstanceState.get(uid)
  if (instance) {
    if (instance.status === 'error') {
      return undefined
    }
    return instance.rpc
  }
  return getRpcForView(viewId, assetDir, platform)
}

export const createViewInstance = async (
  viewId: string,
  uid: number,
  context: unknown,
  assetDir: string,
  platform: number,
): Promise<CreateViewInstanceResult> => {
  try {
    const rpc = await getRpcForView(viewId, assetDir, platform)
    const result = await rpc.invoke('ExtensionApi.createViewInstance', viewId, uid, context)
    ExtensionViewInstanceState.set(uid, {
      rpc,
      status: 'ready',
      viewId,
    })
    return {
      ok: true,
      result,
    }
  } catch (error) {
    const serializedError = serializeError(error)
    ExtensionViewInstanceState.set(uid, {
      error: serializedError,
      status: 'error',
      viewId,
    })
    return {
      error: serializedError,
      ok: false,
    }
  }
}

export const dispatchViewEvent = async (viewId: string, uid: number, event: unknown, assetDir: string, platform: number): Promise<unknown> => {
  const rpc = await getRpcForInstance(viewId, uid, assetDir, platform)
  if (!rpc) {
    return undefined
  }
  return rpc.invoke('ExtensionApi.dispatchViewEvent', uid, event)
}

export const disposeViewInstance = async (viewId: string, uid: number, assetDir: string, platform: number): Promise<void> => {
  const rpc = await getRpcForInstance(viewId, uid, assetDir, platform)
  if (!rpc) {
    ExtensionViewInstanceState.remove(uid)
    return
  }
  await rpc.invoke('ExtensionApi.disposeViewInstance', uid)
  ExtensionViewInstanceState.remove(uid)
}

export const saveViewInstanceState = async (viewId: string, uid: number, assetDir: string, platform: number): Promise<unknown> => {
  const rpc = await getRpcForInstance(viewId, uid, assetDir, platform)
  if (!rpc) {
    return undefined
  }
  return rpc.invoke('ExtensionApi.saveViewInstanceState', uid)
}
