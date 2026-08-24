import type { Rpc } from '@lvce-editor/rpc'
import * as ActivateByEvent from '../ActivateByEvent/ActivateByEvent.ts'
import { disposeExtensionRuntime } from '../DisposeExtensionRuntime/DisposeExtensionRuntime.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import * as ExtensionView from '../ExtensionView/ExtensionView.ts'
import * as ExtensionViewInstanceState from '../ExtensionViewInstanceState/ExtensionViewInstanceState.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

interface Extension {
  readonly id: string
}

interface ViewSnapshot {
  readonly context: unknown
  readonly savedState: unknown
  readonly uid: number
  readonly viewId: string
}

interface Dependencies {
  readonly activateByEvent: typeof ActivateByEvent.activateByEvent
  readonly createViewInstance: typeof ExtensionView.createViewInstance
  readonly disposeExtensionRuntime: typeof disposeExtensionRuntime
  readonly getRpc: typeof IsolatedExtensionHostWorkerState.get
  readonly getRuntimeStatus: typeof ExtensionsState.getRuntimeStatus
  readonly getViewEntries: typeof ExtensionViewInstanceState.getEntries
  readonly removeViewInstance: typeof ExtensionViewInstanceState.remove
  readonly requestViewRerender: typeof ExtensionView.requestViewRerender
}

const defaultDependencies: Dependencies = {
  activateByEvent: ActivateByEvent.activateByEvent,
  createViewInstance: ExtensionView.createViewInstance,
  disposeExtensionRuntime,
  getRpc: IsolatedExtensionHostWorkerState.get,
  getRuntimeStatus: ExtensionsState.getRuntimeStatus,
  getViewEntries: ExtensionViewInstanceState.getEntries,
  removeViewInstance: ExtensionViewInstanceState.remove,
  requestViewRerender: ExtensionView.requestViewRerender,
}

const saveViewState = async (rpc: Rpc, uid: number): Promise<unknown> => {
  try {
    return await rpc.invoke('ExtensionApi.saveViewInstanceState', uid)
  } catch {
    return undefined
  }
}

const getViewSnapshots = async (rpc: Rpc, dependencies: Dependencies): Promise<readonly ViewSnapshot[]> => {
  const entries = dependencies.getViewEntries().filter(({ instance }) => instance.status === 'ready' && instance.rpc === rpc)
  return Promise.all(
    entries.map(async ({ instance, uid }) => {
      const readyInstance = instance as ExtensionViewInstanceState.ReadyExtensionViewInstance
      return {
        context: readyInstance.context,
        savedState: await saveViewState(rpc, uid),
        uid,
        viewId: readyInstance.viewId,
      }
    }),
  )
}

const withSavedState = (context: unknown, savedState: unknown): unknown => {
  if (context && typeof context === 'object' && !Array.isArray(context)) {
    return {
      ...context,
      state: savedState,
    }
  }
  return { state: savedState }
}

export const restartLinkedExtension = async (
  extension: Extension,
  assetDir: string,
  platform: number,
  dependencies: Dependencies = defaultDependencies,
): Promise<boolean> => {
  const rpc = dependencies.getRpc(extension.id)
  if (!rpc) {
    return false
  }
  const activationEvent = dependencies.getRuntimeStatus(extension.id)?.activationEvent || ''
  const snapshots = await getViewSnapshots(rpc, dependencies)
  for (const snapshot of snapshots) {
    dependencies.removeViewInstance(snapshot.uid)
  }
  await dependencies.disposeExtensionRuntime(extension.id)
  if (activationEvent) {
    await dependencies.activateByEvent(activationEvent, assetDir, platform)
  }
  for (const snapshot of snapshots) {
    const result = await dependencies.createViewInstance(
      snapshot.viewId,
      snapshot.uid,
      withSavedState(snapshot.context, snapshot.savedState),
      assetDir,
      platform,
    )
    if (result.ok) {
      await dependencies.requestViewRerender(snapshot.uid)
    }
  }
  return true
}
