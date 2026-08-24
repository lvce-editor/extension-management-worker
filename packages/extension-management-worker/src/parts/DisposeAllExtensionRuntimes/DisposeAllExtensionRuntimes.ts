import { SharedProcess } from '@lvce-editor/rpc-registry'
import * as ActivateByEvent from '../ActivateByEvent/ActivateByEvent.ts'
import { disposeIsolatedExtensionHostWorker } from '../DisposeIsolatedExtensionHostWorker/DisposeIsolatedExtensionHostWorker.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import * as FileChangeHandlerRegistry from '../FileChangeHandlerRegistry/FileChangeHandlerRegistry.ts'
import { getAllExtensions } from '../GetExtensions/GetExtensions.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

type GetAllExtensions = typeof getAllExtensions

const disposeLanguageServers = async (extensionIds: readonly string[], disposeAll: boolean): Promise<void> => {
  if (!disposeAll) {
    await Promise.all(
      extensionIds.map(async (extensionId) => {
        try {
          await SharedProcess.invoke('LanguageServer.dispose', extensionId)
        } catch {
          // Older shared processes may not expose per-extension disposal.
        }
      }),
    )
    return
  }
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

const getRetainedExtensionIds = async (getExtensions: GetAllExtensions): Promise<ReadonlySet<string>> => {
  try {
    const extensions = await getExtensions('', 0)
    return new Set(
      extensions
        .filter((extension) => extension.preserveRuntimeOnWorkspaceChange === true)
        .map((extension) => extension.id)
        .filter((id): id is string => typeof id === 'string'),
    )
  } catch {
    return new Set()
  }
}

export const disposeAllExtensionRuntimes = async (getExtensions: GetAllExtensions = getAllExtensions): Promise<void> => {
  await ActivateByEvent.waitForExtensionActivations()
  const retainedExtensionIds = await getRetainedExtensionIds(getExtensions)
  const extensionIds = IsolatedExtensionHostWorkerState.getIds().filter((extensionId) => !retainedExtensionIds.has(extensionId))
  await disposeLanguageServers(extensionIds, retainedExtensionIds.size === 0)
  await Promise.all(extensionIds.map((extensionId) => disposeIsolatedExtensionHostWorker(extensionId)))
  ActivateByEvent.resetAllExtensionActivations()
  ExtensionsState.resetRuntimeState()
  if (retainedExtensionIds.size === 0) {
    FileChangeHandlerRegistry.reset()
  }
}
