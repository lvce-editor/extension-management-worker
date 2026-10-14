import * as ActivateByEvent from '../ActivateByEvent/ActivateByEvent.ts'
import * as ExtensionFileWatcher from '../ExtensionFileWatcher/ExtensionFileWatcher.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import * as FileChangeHandlerRegistry from '../FileChangeHandlerRegistry/FileChangeHandlerRegistry.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'
import * as RendererWorker from '../Rpc/Rpc.ts'

type Invoke = typeof RendererWorker.invoke

export const disposeIsolatedExtensionHostWorker = async (extensionId: string, invoke: Invoke = RendererWorker.invoke): Promise<boolean> => {
  FileChangeHandlerRegistry.unregister(extensionId)
  const rpc = IsolatedExtensionHostWorkerState.remove(extensionId)
  if (!rpc) {
    await ExtensionFileWatcher.disposeOwner(extensionId)
    return false
  }
  ActivateByEvent.resetExtensionActivation(extensionId)
  ExtensionsState.resetExtensionRuntimeState(extensionId)
  // Close all owned resources even if one backend fails during teardown.
  const [watchers] = await Promise.allSettled([
    ExtensionFileWatcher.disposeOwner(extensionId),
    Promise.try(() => invoke('LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker', extensionId)),
    Promise.try(() => rpc.dispose()),
  ])
  // Older renderers may not support worker disposal; watcher cleanup failures
  // still need to remain visible so their registrations can be retried.
  if (watchers.status === 'rejected') throw watchers.reason
  return true
}
