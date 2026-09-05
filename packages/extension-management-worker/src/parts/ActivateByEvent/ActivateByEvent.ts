/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import { activateExtension3 } from '../ActivateExtension3/ActivateExtension3.ts'
import { getAllExtensionsWithState } from '../GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import { getExtensionAbsolutePath } from '../GetExtensionAbsolutePath/GetExtensionAbsolutePath.ts'
import { getAllExtensions } from '../GetExtensions/GetExtensions.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'
import { notifyRunningExtensionsChanged } from '../NotifyRunningExtensionsChanged/NotifyRunningExtensionsChanged.ts'

export interface ActivateByEventResult {
  readonly error: Error | undefined
  readonly hasActivatedExtensions: boolean
}

const activatingExtensions: Record<string, Promise<void>> = Object.create(null)
const runningExtensions: Record<string, boolean> = Object.create(null)

interface ActivationState {
  readonly activatingExtensions: Record<string, Promise<void>>
  readonly runningExtensions: Record<string, boolean>
}

const applicationActivations = new Map<string, ActivationState>()

const getActivationState = (application?: ExtensionsState): ActivationState => {
  if (application?.applicationId === undefined) {
    return { activatingExtensions, runningExtensions }
  }
  const key = JSON.stringify([application.applicationId, application.applicationGeneration])
  let activation = applicationActivations.get(key)
  if (!activation) {
    activation = { activatingExtensions: Object.create(null), runningExtensions: Object.create(null) }
    applicationActivations.set(key, activation)
  }
  return activation
}

export const resetExtensionActivation = (extensionId: string, application?: ExtensionsState): void => {
  const { activatingExtensions, runningExtensions } = getActivationState(application)
  delete activatingExtensions[extensionId]
  delete runningExtensions[extensionId]
}

export const resetAllExtensionActivations = (application?: ExtensionsState): void => {
  const { activatingExtensions, runningExtensions } = getActivationState(application)
  for (const extensionId of Object.keys(activatingExtensions)) {
    delete activatingExtensions[extensionId]
  }
  for (const extensionId of Object.keys(runningExtensions)) {
    delete runningExtensions[extensionId]
  }
  if (application?.applicationId !== undefined) {
    applicationActivations.delete(JSON.stringify([application.applicationId, application.applicationGeneration]))
  }
}

export const waitForExtensionActivations = async (application?: ExtensionsState): Promise<void> => {
  const { activatingExtensions } = getActivationState(application)
  await Promise.all(Object.values(activatingExtensions))
}

const matchesEvent = (extension: any, event: string): boolean => {
  return (
    !extension.disabled &&
    IsExtensionIsolated.isExtensionIsolated(extension) &&
    Array.isArray(extension.activation) &&
    extension.activation.includes(event)
  )
}

const getExtensionId = (extension: any): string => {
  return extension.id
}

const getAbsolutePath = (extension: any, assetDir: string, platform: number): string => {
  return getExtensionAbsolutePath(
    extension.id,
    extension.isWeb,
    extension.builtin,
    extension.path || extension.uri,
    extension.browser,
    globalThis.location.origin,
    platform,
    assetDir,
  )
}

const doActivateExtension = async (
  extension: any,
  absolutePath: string,
  event: string,
  platform: number,
  activation: ActivationState,
): Promise<void> => {
  const { activatingExtensions, runningExtensions } = activation
  const extensionId = getExtensionId(extension)
  try {
    await activateExtension3(extension, absolutePath, event, platform)
    runningExtensions[extensionId] = true
    if (extension.applicationId === undefined) {
      notifyRunningExtensionsChanged()
    } else {
      notifyRunningExtensionsChanged(extension.applicationId)
    }
  } finally {
    delete activatingExtensions[extensionId]
  }
}

const activateExtension = async (extension: any, event: string, assetDir: string, platform: number, activation: ActivationState): Promise<void> => {
  const { activatingExtensions, runningExtensions } = activation
  const extensionId = getExtensionId(extension)
  if (runningExtensions[extensionId]) {
    return
  }
  if (!Object.hasOwn(activatingExtensions, extensionId)) {
    const absolutePath = getAbsolutePath(extension, assetDir, platform)
    activatingExtensions[extensionId] = doActivateExtension(extension, absolutePath, event, platform, activation)
  }
  await activatingExtensions[extensionId]
}

export const activateByEvent = async (
  event: string,
  assetDir: string,
  platform: number,
  application?: ExtensionsState,
): Promise<ActivateByEventResult> => {
  const activation = getActivationState(application)
  const { activatingExtensions } = activation
  try {
    if (event === 'none') {
      await Promise.all(Object.values(activatingExtensions))
      return {
        error: undefined,
        hasActivatedExtensions: Object.keys(activatingExtensions).length > 0,
      }
    }
    const { assetDir: resolvedAssetDir, platform: resolvedPlatform } = await getRuntimeContext(assetDir, platform)
    const extensions =
      application?.applicationId === undefined
        ? await getAllExtensions(resolvedAssetDir, resolvedPlatform)
        : await getAllExtensionsWithState(application, resolvedAssetDir, resolvedPlatform)
    const matchingExtensions = extensions.filter((extension) => matchesEvent(extension, event))
    for (const extension of matchingExtensions) {
      await activateExtension(extension, event, resolvedAssetDir, resolvedPlatform, activation)
    }
    return {
      error: undefined,
      hasActivatedExtensions: matchingExtensions.length > 0,
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
      hasActivatedExtensions: false,
    }
  }
}
