import * as Assert from '@lvce-editor/assert'
import { PlatformType } from '@lvce-editor/constants'
import * as ExtensionStorage from '../ExtensionStorage/ExtensionStorage.ts'
import { invalidateExtensionsCache } from '../InvalidateExtensionsCache/InvalidateExtensionsCache.ts'
import * as WorkspaceExtensionEnablementStorage from '../WorkspaceExtensionEnablementStorage/WorkspaceExtensionEnablementStorage.ts'

export const enableExtension2 = async (id: string, platform: number): Promise<void> => {
  Assert.string(id)
  Assert.number(platform)
  if (platform !== PlatformType.Test) {
    await WorkspaceExtensionEnablementStorage.clearExtensionOverride(id)
  }
  await ExtensionStorage.enableExtension2(id, platform)
  await invalidateExtensionsCache(id, false)
}
