import * as GetExtensions from '../GetExtensions/GetExtensions.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'
import { getViewsFromExtensions } from '../GetViewsFromExtensions/GetViewsFromExtensions.ts'

export const getViews = async (assetDir: string, platform: number): Promise<readonly any[]> => {
  const { assetDir: resolvedAssetDir, platform: resolvedPlatform } = await getRuntimeContext(assetDir, platform)
  const extensions = await GetExtensions.getAllExtensions(resolvedAssetDir, resolvedPlatform)
  return getViewsFromExtensions(extensions, resolvedAssetDir, resolvedPlatform)
}
