import { SharedProcess } from '@lvce-editor/rpc-registry'
import * as ActivateByEvent from '../ActivateByEvent/ActivateByEvent.ts'
import { disposeIsolatedExtensionHostWorker } from '../DisposeIsolatedExtensionHostWorker/DisposeIsolatedExtensionHostWorker.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import * as FileChangeHandlerRegistry from '../FileChangeHandlerRegistry/FileChangeHandlerRegistry.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const disposeLanguageServers = async (extensionIds: readonly string[]): Promise<void> => {
  try {
    await SharedProcess.invoke('LanguageServer.disposeAll')
  } catch {
    await Promise.all(
      extensionIds.map(async (extensionId) => {
        try {
          await SharedProcess.invoke('LanguageServer.dispose', extensionId)
        } catch {
          // Older shared processes may not expose language server disposal.
        }
      }),
    )
  }
}

export const disposeAllExtensionRuntimes = async (): Promise<void> => {
  await ActivateByEvent.waitForExtensionActivations()
  const extensionIds = IsolatedExtensionHostWorkerState.getIds()
  await disposeLanguageServers(extensionIds)
  await Promise.all(extensionIds.map((extensionId) => disposeIsolatedExtensionHostWorker(extensionId)))
  ActivateByEvent.resetAllExtensionActivations()
  ExtensionsState.resetRuntimeState()
  FileChangeHandlerRegistry.reset()
}
