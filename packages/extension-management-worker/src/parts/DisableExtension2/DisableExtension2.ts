import * as Assert from '@lvce-editor/assert'
import { disposeIsolatedExtensionHostWorker } from '../DisposeIsolatedExtensionHostWorker/DisposeIsolatedExtensionHostWorker.ts'
import * as ExtensionStorage from '../ExtensionStorage/ExtensionStorage.ts'
import { deferInvalidateExtensionsCache } from '../InvalidateExtensionsCache/InvalidateExtensionsCache.ts'

export const disableExtension2 = async (id: string, platform: number): Promise<unknown> => {
  Assert.string(id)
  Assert.number(platform)
  try {
    await ExtensionStorage.disableExtension2(id, platform)
    await disposeIsolatedExtensionHostWorker(id)
    deferInvalidateExtensionsCache(id, true)
    return undefined
  } catch (error) {
    return error
  }
}
