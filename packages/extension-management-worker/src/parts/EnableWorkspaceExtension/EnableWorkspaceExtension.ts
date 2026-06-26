import * as Assert from '@lvce-editor/assert'
import { invalidateExtensionsCache } from '../InvalidateExtensionsCache/InvalidateExtensionsCache.ts'
import * as WorkspaceDisabledExtensionsStorage from '../WorkspaceDisabledExtensionsStorage/WorkspaceDisabledExtensionsStorage.ts'

export const enableWorkspaceExtension = async (id: string): Promise<void> => {
  Assert.string(id)
  await WorkspaceDisabledExtensionsStorage.enableExtension(id)
  await invalidateExtensionsCache()
}
