import * as Assert from '@lvce-editor/assert'
import { PlatformType } from '@lvce-editor/constants'
import { disposeExtensionRuntime } from '../DisposeExtensionRuntime/DisposeExtensionRuntime.ts'
import * as ExtensionStorage from '../ExtensionStorage/ExtensionStorage.ts'
import { deferInvalidateExtensionsCache } from '../InvalidateExtensionsCache/InvalidateExtensionsCache.ts'
import * as WorkspaceExtensionEnablementStorage from '../WorkspaceExtensionEnablementStorage/WorkspaceExtensionEnablementStorage.ts'

export const disableExtension2 = async (id: string, platform: number): Promise<unknown> => {
  Assert.string(id)
  Assert.number(platform)
  try {
    if (platform !== PlatformType.Test) {
      await WorkspaceExtensionEnablementStorage.clearExtensionOverride(id)
    }
    await ExtensionStorage.disableExtension2(id, platform)
    await disposeExtensionRuntime(id)
    deferInvalidateExtensionsCache(id, true)
    return undefined
  } catch (error) {
    return error
  }
}
