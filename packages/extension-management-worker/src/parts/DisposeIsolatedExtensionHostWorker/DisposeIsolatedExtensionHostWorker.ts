import * as ActivateByEvent from '../ActivateByEvent/ActivateByEvent.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'
import * as RendererWorker from '../Rpc/Rpc.ts'

type Invoke = typeof RendererWorker.invoke

export const disposeIsolatedExtensionHostWorker = async (extensionId: string, invoke: Invoke = RendererWorker.invoke): Promise<boolean> => {
  const rpc = IsolatedExtensionHostWorkerState.remove(extensionId)
  if (!rpc) {
    return false
  }
  ActivateByEvent.resetExtensionActivation(extensionId)
  ExtensionsState.resetExtensionRuntimeState(extensionId)
  try {
    await invoke('LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker', extensionId)
  } catch {
    // Older renderer workers only support disposing the extension RPC.
  }
  try {
    await rpc.dispose()
  } catch {
    // The extension is already disabled and removed from state.
  }
  return true
}
