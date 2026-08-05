/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import { getAllExtensionsWithState } from '../GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import { getRpc } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'

interface ExtensionManifest {
  readonly activation?: readonly string[]
  readonly disabled?: boolean
  readonly id?: string
  readonly isolated?: boolean
}

const matchesEvent = (extension: ExtensionManifest, event: string): boolean => {
  return (
    !extension.disabled &&
    IsExtensionIsolated.isExtensionIsolated(extension) &&
    Array.isArray(extension.activation) &&
    extension.activation.includes(event)
  )
}

export const executeProvidersByEvent = async (
  extensionsState: ExtensionsState,
  event: string,
  method: string,
  ...params: readonly unknown[]
): Promise<readonly unknown[]> => {
  const { assetDir, platform } = await getRuntimeContext('', extensionsState.platform)
  const extensions = await getAllExtensionsWithState(extensionsState, assetDir, platform)
  const matchingExtensions = extensions.filter((extension) => matchesEvent(extension, event))
  const rpcs = await Promise.all(matchingExtensions.map((extension) => getRpc(extension, assetDir, platform)))
  return Promise.all(rpcs.map((rpc) => rpc.invoke(method, ...params)))
}
