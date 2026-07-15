import type { ExtensionManifest } from '../GetViewsTypes/GetViewsTypes.ts'
import { getExtensionViews } from '../GetExtensionViews/GetExtensionViews.ts'
import { shouldLoadViews } from '../ShouldLoadViews/ShouldLoadViews.ts'

export const getViewsFromExtensionWorkers = async (
  extensions: readonly ExtensionManifest[],
  assetDir: string,
  platform: number,
): Promise<readonly any[]> => {
  const matchingExtensions = extensions.filter(shouldLoadViews)
  const results = await Promise.all(matchingExtensions.map((extension) => getExtensionViews(extension, assetDir, platform)))
  return results.flat()
}
