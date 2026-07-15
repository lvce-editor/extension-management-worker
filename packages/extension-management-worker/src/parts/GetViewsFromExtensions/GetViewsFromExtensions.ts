import type { ExtensionManifest } from '../GetViewsTypes/GetViewsTypes.ts'
import { getExtensionViews } from '../GetExtensionViews/GetExtensionViews.ts'
import { shouldLoadViews } from '../ShouldLoadViews/ShouldLoadViews.ts'

export const getViewsFromExtensions = (extensions: readonly ExtensionManifest[], assetDir: string, platform: number): readonly any[] => {
  const matchingExtensions = extensions.filter(shouldLoadViews)
  return matchingExtensions.flatMap((extension) => getExtensionViews(extension, assetDir, platform))
}
