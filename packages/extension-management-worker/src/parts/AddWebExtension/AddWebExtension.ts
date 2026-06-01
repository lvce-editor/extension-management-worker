import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import * as GetWebExtensionManifest from '../GetWebExtensionManifest/GetWebExtensionManifest.ts'
import * as GetWebManifestPath from '../GetWebManifestPath/GetWebManifestPath.ts'
import * as StatusBarHandleChange from '../StatusBarHandleChange/StatusBarHandleChange.ts'

const hasStatusBarItems = (manifest: any): boolean => {
  return Array.isArray(manifest.statusBarItems) && manifest.statusBarItems.length > 0
}

export const addWebExtension = async (path: string): Promise<any> => {
  if (ExtensionsState.hasWebExtensionUri(path)) {
    return undefined
  }
  const manifestPath = GetWebManifestPath.getWebManifestPath(path)
  const manifest = await GetWebExtensionManifest.getWebExtensionManifest(path, manifestPath)
  ExtensionsState.addWebExtension(manifest)
  ExtensionsState.clearCachedExtensions()
  if (hasStatusBarItems(manifest)) {
    await StatusBarHandleChange.handleChange(manifest.id || path)
  }
  return manifest
}
