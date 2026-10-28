import type { Rpc } from '@lvce-editor/rpc'
import { PlatformType } from '@lvce-editor/constants'
import { get as getRpc, RendererWorker, RpcId } from '@lvce-editor/rpc-registry'

export interface RuntimeContext {
  readonly assetDir: string
  readonly platform: number
}

const isMissingAssetDir = (assetDir: unknown): boolean => {
  return typeof assetDir !== 'string' || assetDir.length === 0
}

// Layout.assetDir is immutable for a renderer connection. Weak ownership also
// isolates replacement connections and releases entries when they are disposed.
const assetDirectories = new WeakMap<Rpc, Promise<string>>()

const getDefaultAssetDir = (): Promise<string> => {
  const rpc = getRpc(RpcId.RendererWorker)
  if (!rpc) {
    return RendererWorker.invoke('Layout.getAssetDir')
  }
  const cached = assetDirectories.get(rpc)
  if (cached) {
    return cached
  }
  const pending = Promise.try(() => rpc.invoke('Layout.getAssetDir'))
  assetDirectories.set(rpc, pending)
  const forget = (): void => {
    if (assetDirectories.get(rpc) === pending) {
      assetDirectories.delete(rpc)
    }
  }
  void pending.then((value) => {
    if (isMissingAssetDir(value)) {
      forget()
    }
  }, forget)
  return pending
}

const isMissingPlatform = (platform: unknown): boolean => {
  return typeof platform !== 'number' || platform === 0
}

const isStaticHttpAssetDir = (assetDir: string): boolean => {
  return assetDir.startsWith('/') || assetDir.startsWith('http')
}

const isHttpLocation = (): boolean => {
  return Reflect.has(globalThis, 'location') && globalThis.location.protocol.startsWith('http')
}

export const getRuntimeContext = async (assetDir: string, platform: number, applicationId?: string): Promise<RuntimeContext> => {
  const shouldInferPlatform = isMissingPlatform(platform)
  const invoke = (command: string): Promise<any> =>
    applicationId === undefined ? RendererWorker.invoke(command) : RendererWorker.invoke('Application.execute', applicationId, command)
  let resolvedAssetDir = assetDir
  if (isMissingAssetDir(assetDir)) {
    resolvedAssetDir = applicationId === undefined ? await getDefaultAssetDir() : await invoke('Layout.getAssetDir')
  }
  const resolvedPlatform = shouldInferPlatform ? await invoke('Layout.getPlatform') : platform
  if (shouldInferPlatform && isHttpLocation() && isStaticHttpAssetDir(resolvedAssetDir)) {
    return {
      assetDir: resolvedAssetDir,
      platform: PlatformType.Web,
    }
  }
  return {
    assetDir: resolvedAssetDir,
    platform: resolvedPlatform,
  }
}
