import type { ExtensionManifest } from '../GetViewsTypes/GetViewsTypes.ts'
import { toView } from '../ToView/ToView.ts'

export const getExtensionViews = (extension: ExtensionManifest, assetDir: string, platform: number): readonly any[] => {
  if (!Array.isArray(extension.views)) {
    return []
  }
  return extension.views.filter((view) => view && typeof view.id === 'string').map((view) => toView(extension, view, assetDir, platform))
}
