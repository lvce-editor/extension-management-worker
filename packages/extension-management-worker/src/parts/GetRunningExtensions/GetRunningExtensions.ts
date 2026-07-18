import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import { getAllExtensions } from '../GetExtensions/GetExtensions.ts'
import { getRunningExtensionsFromState } from '../GetRunningExtensionsFromState/GetRunningExtensionsFromState.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'

export const getRunningExtensions = async (assetDir: string, platform: number): Promise<readonly any[]> => {
  const { assetDir: resolvedAssetDir, platform: resolvedPlatform } = await getRuntimeContext(assetDir, platform)
  const extensions = await getAllExtensions(resolvedAssetDir, resolvedPlatform)
  const { runtimeStatuses } = ExtensionsState.get()
  return getRunningExtensionsFromState(extensions, runtimeStatuses, resolvedAssetDir, resolvedPlatform)
}
