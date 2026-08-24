import * as Assert from '@lvce-editor/assert'
import { invalidateExtensionsCache } from '../InvalidateExtensionsCache/InvalidateExtensionsCache.ts'
import * as WorkspaceExtensionEnablementStorage from '../WorkspaceExtensionEnablementStorage/WorkspaceExtensionEnablementStorage.ts'

export const enableWorkspaceExtension = async (id: string): Promise<void> => {
  Assert.string(id)
  await WorkspaceExtensionEnablementStorage.enableExtension(id)
  await invalidateExtensionsCache(id, false)
}
