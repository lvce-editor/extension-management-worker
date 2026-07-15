import type { ExtensionManifest } from '../GetViewsTypes/GetViewsTypes.ts'
import { getRpc } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import { getRpcViewRegistrySnapshot } from '../GetRpcViewRegistrySnapshot/GetRpcViewRegistrySnapshot.ts'
import { toView } from '../ToView/ToView.ts'

export const getExtensionViews = async (extension: ExtensionManifest, assetDir: string, platform: number): Promise<readonly any[]> => {
  const rpc = await getRpc(extension, assetDir, platform)
  const snapshot = await getRpcViewRegistrySnapshot(rpc)
  if (!Array.isArray(snapshot.views)) {
    return []
  }
  return snapshot.views.filter((view) => view && typeof view.id === 'string').map((view) => toView(extension, view, assetDir, platform))
}
