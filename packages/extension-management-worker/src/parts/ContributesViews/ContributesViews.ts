import type { ExtensionManifest } from '../GetViewsTypes/GetViewsTypes.ts'

export const contributesViews = (extension: ExtensionManifest): boolean => {
  return Array.isArray(extension.views) && extension.views.length > 0
}
