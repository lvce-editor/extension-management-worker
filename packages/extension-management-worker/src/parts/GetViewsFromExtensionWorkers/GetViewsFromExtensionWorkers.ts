import type { ExtensionManifest } from '../GetViewsTypes/GetViewsTypes.ts'
import { contributesViews } from '../ContributesViews/ContributesViews.ts'
import { getExtensionViews } from '../GetExtensionViews/GetExtensionViews.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'

export const getViewsFromExtensionWorkers = async (
  extensions: readonly ExtensionManifest[],
  assetDir: string,
  platform: number,
): Promise<readonly any[]> => {
  const matchingExtensions = extensions.filter((extension) => IsExtensionIsolated.isExtensionIsolated(extension) && contributesViews(extension))
  const results = await Promise.all(matchingExtensions.map((extension) => getExtensionViews(extension, assetDir, platform)))
  return results.flat()
}
