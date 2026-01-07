import { invalidateExtensionsCache } from '../InvalidateExtensionsCache/InvalidateExtensionsCache.ts'
import * as ExtensionStorage from '../ExtensionStorage/ExtensionStorage.ts'

export const disableExtension2 = async (id: string, platform: number): Promise<unknown> => {
  try {
    await ExtensionStorage.disableextension2(id, platform)
    await invalidateExtensionsCache()
    return undefined
  } catch (error) {
    return error
  }
}
