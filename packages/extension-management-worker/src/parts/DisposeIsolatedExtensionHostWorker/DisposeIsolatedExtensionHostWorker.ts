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
  await rpc.dispose().catch(() => {})
  return true
}
