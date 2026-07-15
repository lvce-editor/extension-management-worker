import type { ExtensionManifest, ManifestView } from '../GetViewsTypes/GetViewsTypes.ts'

export const getManifestView = (extension: ExtensionManifest, id: string): ManifestView | undefined => {
  return extension.views?.find((view) => view.id === id)
}
