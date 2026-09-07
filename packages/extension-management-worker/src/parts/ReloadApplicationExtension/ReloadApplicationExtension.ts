/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import { resetExtensionActivation, waitForExtensionActivations } from '../ActivateByEvent/ActivateByEvent.ts'
import * as ExtensionApplicationServices from '../ExtensionApplicationServices/ExtensionApplicationServices.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import * as FileChangeHandlerRegistry from '../FileChangeHandlerRegistry/FileChangeHandlerRegistry.ts'
import { getRuntimeId } from '../GetOrCreateIsolatedExtensionHostWorker/GetOrCreateIsolatedExtensionHostWorker.ts'
import * as Rpcs from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'
import * as RendererWorker from '../Rpc/Rpc.ts'

const queues = new Map<number, Promise<void>>()

const replace = async (application: ExtensionsState.ExtensionsState, extensionId: string, extension: any): Promise<void> => {
  ExtensionsState.assertCurrentApplication(application)
  if (!extension || typeof extension.id !== 'string' || !extension.id || typeof extension.browser !== 'string' || extension.isolated !== true) {
    throw new Error('Expected an isolated web extension')
  }
  const applicationId = application.applicationId!
  const current = ExtensionsState.get(applicationId)
  if (current.webExtensions.every(({ id }) => id !== extensionId)) {
    throw new Error(`Application extension not found: ${extensionId}`)
  }
  if (extension.id !== extensionId && current.webExtensions.some(({ id }) => id === extension.id)) {
    throw new Error(`Duplicate application extension: ${extension.id}`)
  }
  // Finish pending startup before removing its RPC, including failed activations.
  try {
    await waitForExtensionActivations(current)
  } catch {
    // Failed startup must still allow replacing the broken extension.
  }
  ExtensionsState.assertCurrentApplication(application)
  const rpc = Rpcs.remove(extensionId, applicationId)
  FileChangeHandlerRegistry.unregister(extensionId, applicationId)
  const results = await Promise.allSettled([
    ExtensionApplicationServices.disposeExtension(application, extensionId),
    Promise.try(() => rpc?.dispose()),
    RendererWorker.invoke('LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker', getRuntimeId(extensionId, application)),
  ])
  ExtensionsState.assertCurrentApplication(application)
  resetExtensionActivation(extensionId, application)
  ExtensionsState.resetExtensionRuntimeState(extensionId, applicationId)
  const errors = results.filter((result) => result.status === 'rejected').map((result) => result.reason)
  if (errors.length > 0) throw new AggregateError(errors, `Failed to reload extension ${extensionId}`)
  ExtensionsState.update(
    {
      cachedExtensions: undefined,
      webExtensions: ExtensionsState.get(applicationId).webExtensions.map((previous) => (previous.id === extensionId ? { ...extension } : previous)),
    },
    applicationId,
  )
}

const run = async (previous: Promise<void>, application: ExtensionsState.ExtensionsState, extensionId: string, extension: any): Promise<void> => {
  try {
    await previous
  } catch {
    // A later save can recover from an earlier reload failure.
  }
  await replace(application, extensionId, extension)
}

export const reloadApplicationExtension = async (applicationId: string, extensionId: string, extension: any): Promise<void> => {
  const application = ExtensionsState.get(applicationId)
  const key = application.applicationGeneration!
  const previous = queues.get(key) || Promise.resolve()
  const operation = run(previous, application, extensionId, extension)
  queues.set(key, operation)
  try {
    await operation
  } finally {
    if (queues.get(key) === operation) queues.delete(key)
  }
}
