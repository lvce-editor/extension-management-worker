import type { ExtensionManifest } from '../GetViewsTypes/GetViewsTypes.ts'
import { contributesViews } from '../ContributesViews/ContributesViews.ts'
import { getExtensionId } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'
import * as Logger from '../Logger/Logger.ts'

export const shouldLoadViews = (extension: ExtensionManifest): boolean => {
  if (extension.disabled) {
    return false
  }
  if (!contributesViews(extension)) {
    return false
  }
  if (!IsExtensionIsolated.isExtensionIsolated(extension)) {
    Logger.warn(
      `Extension "${getExtensionId(extension)}" contributes activity bar views but is not isolated. The views will not be shown. Add "isolated": true to extension.json to enable them.`,
    )
    return false
  }
  return true
}
