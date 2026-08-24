import * as Assert from '@lvce-editor/assert'
import { disposeExtensionRuntime } from '../DisposeExtensionRuntime/DisposeExtensionRuntime.ts'
import { invalidateExtensionsCache } from '../InvalidateExtensionsCache/InvalidateExtensionsCache.ts'
import * as WorkspaceExtensionEnablementStorage from '../WorkspaceExtensionEnablementStorage/WorkspaceExtensionEnablementStorage.ts'

export const disableWorkspaceExtension = async (id: string): Promise<void> => {
  Assert.string(id)
  await WorkspaceExtensionEnablementStorage.disableExtension(id)
  await disposeExtensionRuntime(id)
  await invalidateExtensionsCache(id, true)
}
