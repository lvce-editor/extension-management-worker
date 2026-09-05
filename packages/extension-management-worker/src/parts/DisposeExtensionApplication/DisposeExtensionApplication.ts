/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import { resetAllExtensionActivations } from '../ActivateByEvent/ActivateByEvent.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import * as FileChangeHandlerRegistry from '../FileChangeHandlerRegistry/FileChangeHandlerRegistry.ts'
import { getPendingExtensionIds, getRuntimeId } from '../GetOrCreateIsolatedExtensionHostWorker/GetOrCreateIsolatedExtensionHostWorker.ts'
import * as Rpcs from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'
import * as RendererWorker from '../Rpc/Rpc.ts'

export const disposeExtensionApplication = async (applicationId: string): Promise<void> => {
  const application = ExtensionsState.get(applicationId)
  const ids = new Set([...Rpcs.getIds(applicationId), ...getPendingExtensionIds(application)])
  const runtimes = ids
    .values()
    .map((id) => ({ id, rpc: Rpcs.get(id, applicationId) }))
    .toArray()
  // Invalidate pending activations and extension callbacks before awaiting teardown.
  ExtensionsState.removeApplication(applicationId)
  Rpcs.clear(applicationId)
  resetAllExtensionActivations(application)
  FileChangeHandlerRegistry.reset(applicationId)
  const results = await Promise.allSettled(
    runtimes.map(async ({ id, rpc }) => {
      const runtimeId = getRuntimeId(id, application)
      const disposal = await Promise.allSettled([
        Promise.try(() => rpc?.dispose()),
        RendererWorker.invoke('LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker', runtimeId),
      ])
      const errors = disposal.filter((result) => result.status === 'rejected').map((result) => result.reason)
      if (errors.length > 0) {
        throw new AggregateError(errors, `Failed to dispose extension ${id}`)
      }
    }),
  )
  const errors = results.filter((result) => result.status === 'rejected').map((result) => result.reason)
  if (errors.length > 0) {
    throw new AggregateError(errors, `Failed to dispose extension application ${applicationId}`)
  }
}
