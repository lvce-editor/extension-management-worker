import { RendererWorker } from '@lvce-editor/rpc-registry'
import { activateByEvent } from '../ActivateByEvent/ActivateByEvent.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import { getAllExtensions } from '../GetExtensions/GetExtensions.ts'
import { interExtensionId } from '../InferExtensionId/InferExtensionId.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'

const getExtensionId = (extension: any): string => {
  return extension.id || interExtensionId(extension.uri || extension.path)
}

const contributesCommand = (extension: any, id: string): boolean => {
  return Array.isArray(extension.commands) && extension.commands.some((command: any): boolean => command.id === id)
}

const getContributingExtension = async (id: string, platform: number): Promise<any | undefined> => {
  const extensions = await getAllExtensions('', platform)
  return extensions.find((extension: any): boolean => IsExtensionIsolated.isExtensionIsolated(extension) && contributesCommand(extension, id))
}

const getRpcForCommand = async (id: string, platform: number): Promise<any | undefined> => {
  const extension = await getContributingExtension(id, platform)
  if (!extension) {
    return undefined
  }
  const extensionId = getExtensionId(extension)
  const existingRpc = IsolatedExtensionHostWorkerState.get(extensionId)
  if (existingRpc) {
    return existingRpc
  }
  await activateByEvent(`onCommand:${id}`, '', platform)
  return IsolatedExtensionHostWorkerState.get(extensionId)
}

const executeRendererCommand = (id: string, args: readonly unknown[]): Promise<unknown> => {
  return RendererWorker.invoke(id, ...args)
}

export const executeCommand = async (id: string, ...args: readonly unknown[]): Promise<unknown> => {
  const { platform } = ExtensionsState.get()
  const rpc = await getRpcForCommand(id, platform)
  if (rpc) {
    return rpc.invoke('ExtensionApi.executeCommand', id, ...args)
  }
  return executeRendererCommand(id, args)
}
