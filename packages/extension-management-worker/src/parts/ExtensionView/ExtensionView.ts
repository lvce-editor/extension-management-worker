import type { Rpc } from '@lvce-editor/rpc'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import * as ActivateByEvent from '../ActivateByEvent/ActivateByEvent.ts'
import { disposeIsolatedExtensionHostWorker } from '../DisposeIsolatedExtensionHostWorker/DisposeIsolatedExtensionHostWorker.ts'
import * as ExtensionViewInstanceState from '../ExtensionViewInstanceState/ExtensionViewInstanceState.ts'
import * as GetExtensions from '../GetExtensions/GetExtensions.ts'
import {
  getExtensionId,
  getRpc,
  type ExtensionManifest as RpcExtensionManifest,
} from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

interface ManifestView {
  readonly id?: string
}

interface ExtensionManifest extends RpcExtensionManifest {
  readonly activation?: readonly string[]
  readonly views?: readonly ManifestView[]
}

interface CreateViewInstanceSuccess {
  readonly eventListeners?: readonly unknown[]
  readonly ok: true
  readonly result: unknown
  readonly stateful?: boolean
}

interface CreateViewInstanceError {
  readonly error: ExtensionViewInstanceState.SerializedError
  readonly ok: false
}

type CreateViewInstanceResult = CreateViewInstanceSuccess | CreateViewInstanceError

interface RegisteredView {
  readonly eventListeners?: readonly unknown[]
  readonly id?: unknown
  readonly stateful?: boolean
}

interface ViewRegistrySnapshot {
  readonly views?: readonly RegisteredView[]
}

interface ExtensionRpc {
  readonly disposeWorkerWhenLastViewCloses: boolean
  readonly extensionId: string
  readonly rpc: Rpc
}

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

const isCommandNotFoundError = (error: unknown, command: string): boolean => {
  return error instanceof Error && error.name === 'CommandNotFoundError' && error.message.includes(command)
}

const hasView = (extension: ExtensionManifest, viewId: string): boolean => {
  return Array.isArray(extension.views) && extension.views.some((view) => view.id === viewId)
}

const hasOnlyViewAndCommandActivations = (extension: ExtensionManifest): boolean => {
  return (
    Array.isArray(extension.activation) &&
    extension.activation.length > 0 &&
    extension.activation.every((event) => event.startsWith('onView:') || event.startsWith('onCommand:'))
  )
}

const hasOtherViewInstances = (rpc: Rpc): boolean => {
  return ExtensionViewInstanceState.getEntries().some((entry) => entry.instance.status === 'ready' && entry.instance.rpc === rpc)
}

const disposeViewOnlyExtensionWorker = async (extensionId: string, rpc: Rpc): Promise<void> => {
  if (hasOtherViewInstances(rpc)) {
    return
  }
  if (IsolatedExtensionHostWorkerState.get(extensionId) !== rpc) {
    return
  }
  await disposeIsolatedExtensionHostWorker(extensionId)
}

const getExtensionForView = async (viewId: string, assetDir: string, platform: number): Promise<ExtensionManifest> => {
  const extensions = await GetExtensions.getAllExtensions(assetDir, platform)
  const extension = extensions.find((extension) => IsExtensionIsolated.isExtensionIsolated(extension) && hasView(extension, viewId))
  if (!extension) {
    throw new Error(`view ${viewId} not found`)
  }
  return extension
}

const getRpcForView = async (viewId: string, assetDir: string, platform: number): Promise<ExtensionRpc> => {
  const { assetDir: resolvedAssetDir, platform: resolvedPlatform } = await getRuntimeContext(assetDir, platform)
  const extension = await getExtensionForView(viewId, resolvedAssetDir, resolvedPlatform)
  const extensionId = getExtensionId(extension)
  const existingRpc = IsolatedExtensionHostWorkerState.get(extensionId)
  if (existingRpc) {
    return {
      disposeWorkerWhenLastViewCloses: hasOnlyViewAndCommandActivations(extension),
      extensionId,
      rpc: existingRpc,
    }
  }
  const activationResult = await ActivateByEvent.activateByEvent(`onView:${viewId}`, resolvedAssetDir, resolvedPlatform)
  if (activationResult.error) {
    throw activationResult.error
  }
  const rpc = await getRpc(extension, resolvedAssetDir, resolvedPlatform)
  return {
    disposeWorkerWhenLastViewCloses: hasOnlyViewAndCommandActivations(extension),
    extensionId,
    rpc,
  }
}

const getRpcForInstance = async (viewId: string, uid: number, assetDir: string, platform: number): Promise<Rpc | undefined> => {
  const instance = ExtensionViewInstanceState.get(uid)
  if (instance) {
    if (instance.status === 'error') {
      return undefined
    }
    return instance.rpc
  }
  const extensionRpc = await getRpcForView(viewId, assetDir, platform)
  return extensionRpc.rpc
}

interface ViewMetadata {
  readonly eventListeners?: readonly unknown[]
  readonly stateful: boolean
}

const getViewMetadata = async (rpc: Rpc, viewId: string): Promise<ViewMetadata> => {
  const snapshot = (await rpc.invoke('ExtensionApi.getViewRegistrySnapshot')) as ViewRegistrySnapshot | undefined
  if (!Array.isArray(snapshot?.views)) {
    return { stateful: false }
  }
  const view = snapshot.views.find((view) => view?.id === viewId)
  return {
    ...(Array.isArray(view?.eventListeners) && { eventListeners: view.eventListeners }),
    stateful: view?.stateful === true,
  }
}

export const createViewInstance = async (
  viewId: string,
  uid: number,
  context: unknown,
  assetDir: string,
  platform: number,
): Promise<CreateViewInstanceResult> => {
  try {
    const { disposeWorkerWhenLastViewCloses, extensionId, rpc } = await getRpcForView(viewId, assetDir, platform)
    const { eventListeners, stateful } = await getViewMetadata(rpc, viewId)
    const result = await rpc.invoke('ExtensionApi.createViewInstance', viewId, uid, context)
    ExtensionViewInstanceState.set(uid, {
      context,
      disposeWorkerWhenLastViewCloses,
      extensionId,
      rpc,
      status: 'ready',
      viewId,
    })
    return {
      ...(eventListeners && { eventListeners }),
      ok: true,
      result,
      ...(stateful && { stateful: true }),
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

export const getViewMenuEntries = async (
  viewId: string,
  uid: number,
  menuId: string,
  assetDir: string,
  platform: number,
): Promise<readonly unknown[]> => {
  const instance = ExtensionViewInstanceState.get(uid)
  if (!instance || instance.status === 'error') {
    return []
  }
  return instance.rpc.invoke('ExtensionApi.getViewMenuEntries', uid, menuId) as Promise<readonly unknown[]>
}

export const getViewActions = async (viewId: string, uid: number, assetDir: string, platform: number): Promise<readonly unknown[]> => {
  const instance = ExtensionViewInstanceState.get(uid)
  if (!instance || instance.status === 'error') {
    return []
  }
  return instance.rpc.invoke('ExtensionApi.getViewActions', uid) as Promise<readonly unknown[]>
}

export const getViewActionsDom = async (viewId: string, uid: number, assetDir: string, platform: number): Promise<readonly unknown[] | undefined> => {
  const instance = ExtensionViewInstanceState.get(uid)
  if (!instance || instance.status === 'error') {
    return undefined
  }
  try {
    return (await instance.rpc.invoke('ExtensionApi.getViewActionsDom', uid)) as readonly unknown[] | undefined
  } catch (error) {
    if (isCommandNotFoundError(error, 'ExtensionApi.getViewActionsDom')) {
      return undefined
    }
    throw error
  }
}

export const setViewInstanceActive = async (viewId: string, uid: number, active: boolean, assetDir: string, platform: number): Promise<void> => {
  const instance = ExtensionViewInstanceState.get(uid)
  if (!instance || instance.status === 'error') {
    return
  }
  try {
    await instance.rpc.invoke('ExtensionApi.setViewInstanceActive', uid, active)
  } catch (error) {
    if (isCommandNotFoundError(error, 'ExtensionApi.setViewInstanceActive')) {
      return
    }
    throw error
  }
}

export const requestViewRerender = async (uid: number): Promise<void> => {
  await RendererWorker.invoke('Viewlet.executeViewletCommand', uid, 'rerender')
}

export const showViewContextMenu = async (uid: number, viewId: string, menuId: string, x: number, y: number): Promise<void> => {
  await RendererWorker.invoke('ExtensionManagement.showViewContextMenu', uid, viewId, menuId, x, y)
}

export const renderViewInstance = async (viewId: string, uid: number, assetDir: string, platform: number): Promise<unknown> => {
  const instance = ExtensionViewInstanceState.get(uid)
  if (!instance || instance.status === 'error') {
    return undefined
  }
  return instance.rpc.invoke('ExtensionApi.renderViewInstance', uid)
}

export const getViewInstanceState = async (viewId: string, uid: number, assetDir: string, platform: number): Promise<unknown> => {
  const rpc = await getRpcForInstance(viewId, uid, assetDir, platform)
  if (!rpc) {
    return undefined
  }
  return rpc.invoke('ExtensionApi.getViewInstanceState', uid)
}

export const setViewInstanceState = async (viewId: string, uid: number, state: unknown, assetDir: string, platform: number): Promise<unknown> => {
  const rpc = await getRpcForInstance(viewId, uid, assetDir, platform)
  if (!rpc) {
    return undefined
  }
  return rpc.invoke('ExtensionApi.setViewInstanceState', uid, state)
}

export const disposeViewInstance = async (_viewId: string, uid: number, _assetDir: string, _platform: number): Promise<void> => {
  const instance = ExtensionViewInstanceState.get(uid)
  if (!instance || instance.status === 'error') {
    ExtensionViewInstanceState.remove(uid)
    return
  }
  const { disposeWorkerWhenLastViewCloses, extensionId, rpc } = instance
  try {
    await rpc.invoke('ExtensionApi.disposeViewInstance', uid)
  } finally {
    ExtensionViewInstanceState.remove(uid)
    if (disposeWorkerWhenLastViewCloses && extensionId) {
      await disposeViewOnlyExtensionWorker(extensionId, rpc)
    }
  }
}

export const saveViewInstanceState = async (viewId: string, uid: number, assetDir: string, platform: number): Promise<unknown> => {
  const rpc = await getRpcForInstance(viewId, uid, assetDir, platform)
  if (!rpc) {
    return undefined
  }
  return rpc.invoke('ExtensionApi.saveViewInstanceState', uid)
}
