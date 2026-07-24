import * as Assert from '@lvce-editor/assert'
import { disposeIsolatedExtensionHostWorker } from '../DisposeIsolatedExtensionHostWorker/DisposeIsolatedExtensionHostWorker.ts'
import { invalidateExtensionsCache } from '../InvalidateExtensionsCache/InvalidateExtensionsCache.ts'
import * as WorkspaceDisabledExtensionsStorage from '../WorkspaceDisabledExtensionsStorage/WorkspaceDisabledExtensionsStorage.ts'

export const disableWorkspaceExtension = async (id: string): Promise<void> => {
  Assert.string(id)
  await WorkspaceDisabledExtensionsStorage.disableExtension(id)
  await disposeIsolatedExtensionHostWorker(id)
  await invalidateExtensionsCache(id, true)
}
