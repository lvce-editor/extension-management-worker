import * as Assert from '@lvce-editor/assert'
import * as ExtensionStorage from '../ExtensionStorage/ExtensionStorage.ts'
import { invalidateExtensionsCache } from '../InvalidateExtensionsCache/InvalidateExtensionsCache.ts'

export const enableExtension2 = async (id: string, platform: number): Promise<void> => {
  Assert.string(id)
  Assert.number(platform)
  await ExtensionStorage.enableExtension2(id, platform)
  await invalidateExtensionsCache(id, false)
}
