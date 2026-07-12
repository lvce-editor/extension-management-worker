import { addExtension } from '../AddExtension/AddExtension.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import * as GetWebExtensionManifest from '../GetWebExtensionManifest/GetWebExtensionManifest.ts'
import * as GetWebManifestPath from '../GetWebManifestPath/GetWebManifestPath.ts'

export const addWebExtension = async (path: string): Promise<any> => {
  if (ExtensionsState.hasWebExtensionUri(path)) {
    return undefined
  }
  const manifestPath = GetWebManifestPath.getWebManifestPath(path)
  const manifest = await GetWebExtensionManifest.getWebExtensionManifest(path, manifestPath)
  return addExtension(manifest)
}
