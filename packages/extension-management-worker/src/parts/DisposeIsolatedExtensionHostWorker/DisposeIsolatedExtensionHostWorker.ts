import * as ActivateByEvent from '../ActivateByEvent/ActivateByEvent.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

export const disposeIsolatedExtensionHostWorker = async (extensionId: string): Promise<boolean> => {
  const rpc = IsolatedExtensionHostWorkerState.remove(extensionId)
  if (!rpc) {
    return false
  }
  ActivateByEvent.resetExtensionActivation(extensionId)
  ExtensionsState.resetExtensionRuntimeState(extensionId)
  try {
    await rpc.dispose()
  } catch {
    // The extension is already disabled and removed from state.
  }
  return true
}
