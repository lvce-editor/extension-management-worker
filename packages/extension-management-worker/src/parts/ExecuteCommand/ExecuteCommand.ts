/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { Rpc } from '@lvce-editor/rpc'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import { activateByEvent } from '../ActivateByEvent/ActivateByEvent.ts'
import { getAllExtensionsWithState } from '../GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import { interExtensionId } from '../InferExtensionId/InferExtensionId.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

interface ExtensionCommand {
  readonly id: string
}

interface ExtensionManifest {
  readonly commands?: readonly ExtensionCommand[]
  readonly id?: string
  readonly path?: string
  readonly uri?: string
}

const getExtensionId = (extension: ExtensionManifest): string => {
  return extension.id || interExtensionId(extension.uri || extension.path || '')
}

const contributesCommand = (extension: ExtensionManifest, id: string): boolean => {
  return Array.isArray(extension.commands) && extension.commands.some((command): boolean => command.id === id)
}

const getContributingExtension = async (extensionsState: ExtensionsState, id: string, platform: number): Promise<ExtensionManifest | undefined> => {
  const extensions = await getAllExtensionsWithState(extensionsState, '', platform)
  return extensions.find(
    (extension: ExtensionManifest): boolean => IsExtensionIsolated.isExtensionIsolated(extension) && contributesCommand(extension, id),
  )
}

const getRpcForCommand = async (extensionsState: ExtensionsState, id: string, platform: number): Promise<Rpc | undefined> => {
  const extension = await getContributingExtension(extensionsState, id, platform)
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

export const executeCommand = async (extensionsState: ExtensionsState, id: string, ...args: readonly unknown[]): Promise<unknown> => {
  const { result, wasFound } = await executeExtensionCommand(extensionsState, id, ...args)
  if (wasFound) {
    return result
  }
  return executeRendererCommand(id, args)
}

interface ExecuteCommandResult {
  readonly result: unknown
  readonly wasFound: boolean
}

export const executeExtensionCommand = async (
  extensionsState: ExtensionsState,
  id: string,
  ...args: readonly unknown[]
): Promise<ExecuteCommandResult> => {
  const { platform } = extensionsState
  const rpc = await getRpcForCommand(extensionsState, id, platform)
  if (rpc) {
    const result = await rpc.invoke('ExtensionApi.executeCommand', id, ...args)
    return {
      result,
      wasFound: true,
    }
  }
  return {
    result: undefined,
    wasFound: false,
  }
}
