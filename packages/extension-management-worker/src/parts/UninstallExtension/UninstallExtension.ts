import { SharedProcess } from '@lvce-editor/rpc-registry'
import { disposeExtensionRuntime } from '../DisposeExtensionRuntime/DisposeExtensionRuntime.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import { invalidateExtensionsCache } from '../InvalidateExtensionsCache/InvalidateExtensionsCache.ts'

export const uninstallExtension = async (id: string): Promise<void> => {
  const removedWebExtension = ExtensionsState.removeWebExtension(id)
  if (!removedWebExtension) {
    await SharedProcess.invoke('ExtensionManagement.uninstall', id)
  }
  await disposeExtensionRuntime(id)
  await invalidateExtensionsCache()
}
