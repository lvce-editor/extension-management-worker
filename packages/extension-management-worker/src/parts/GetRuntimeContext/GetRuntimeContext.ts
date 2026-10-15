import { PlatformType } from '@lvce-editor/constants'
import { RendererWorker } from '@lvce-editor/rpc-registry'

export interface RuntimeContext {
  readonly assetDir: string
  readonly platform: number
}

const isMissingAssetDir = (assetDir: unknown): boolean => {
  return typeof assetDir !== 'string' || assetDir.length === 0
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
  const resolvedAssetDir = isMissingAssetDir(assetDir) ? await invoke('Layout.getAssetDir') : assetDir
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
