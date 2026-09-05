import * as FileChangeHandlerRegistry from '../FileChangeHandlerRegistry/FileChangeHandlerRegistry.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

export interface FileChanges {
  readonly changed?: readonly string[]
  readonly deleted?: readonly string[]
  readonly renamed?: readonly (readonly [oldUri: string, newUri: string])[]
}

const invokeHandler = async (extensionId: string, changes: Readonly<FileChanges>, applicationId?: string): Promise<void> => {
  const rpc = IsolatedExtensionHostWorkerState.get(extensionId, applicationId)
  if (!rpc) {
    FileChangeHandlerRegistry.unregister(extensionId, applicationId)
    return
  }
  await rpc.invoke('ExtensionApi.handleFileChanges', changes)
}

export const handleFileChanges = async (changes: Readonly<FileChanges> = {}, applicationId?: string): Promise<void> => {
  const extensionIds = FileChangeHandlerRegistry.getRegisteredExtensionIds(applicationId)
  await Promise.allSettled(extensionIds.map(async (extensionId) => invokeHandler(extensionId, changes, applicationId)))
}
