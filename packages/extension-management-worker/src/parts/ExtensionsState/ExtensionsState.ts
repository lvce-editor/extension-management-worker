/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { RuntimeStatus } from '../RuntimeStatus/RuntimeStatus.ts'
import * as RuntimeStatusType from '../RuntimeStatusType/RuntimeStatusType.ts'

export interface ExtensionsState {
  readonly activatedExtensions: Readonly<Record<string, Promise<void>>>
  readonly cachedActivationEvents: Readonly<Record<string, Promise<void>>>
  readonly cachedExtensions: any
  readonly disabledIds: readonly string[]
  readonly platform: number
  readonly runtimeStatuses: Readonly<Record<string, RuntimeStatus>>
  readonly webExtensions: readonly any[]
}

const createInitialState = (): ExtensionsState => {
  return {
    activatedExtensions: Object.create(null),
    cachedActivationEvents: Object.create(null),
    cachedExtensions: undefined,
    disabledIds: [],
    platform: 0,
    runtimeStatuses: Object.create(null),
    webExtensions: [],
  }
}

const createEmptyRuntimeStatus = (id: string): RuntimeStatus => {
  return {
    activationEndTime: 0,
    activationEvent: '',
    activationStartTime: 0,
    activationTime: 0,
    id,
    importEndTime: 0,
    importStartTime: 0,
    importTime: 0,
    status: RuntimeStatusType.None,
  }
}

let extensionsState: ExtensionsState = createInitialState()

export const get = (): ExtensionsState => {
  return extensionsState
}

export const set = (newState: ExtensionsState): void => {
  extensionsState = newState
}

export const update = (newState: Partial<ExtensionsState>): void => {
  set({
    ...extensionsState,
    ...newState,
  })
}

export const reset = (): void => {
  extensionsState = createInitialState()
}

export const setPlatform = (platform: number): void => {
  update({ platform })
}

export const hasWebExtensionUri = (uri: string): boolean => {
  return extensionsState.webExtensions.some((extension) => extension.uri === uri)
}

export const setWebExtensions = (webExtensions: readonly any[]): void => {
  update({ webExtensions })
}

export const addWebExtension = (extension: any): void => {
  update({
    webExtensions: [...extensionsState.webExtensions, extension],
  })
}

export const clearCachedExtensions = (): void => {
  update({ cachedExtensions: undefined })
}

export const setRuntimeStatus = (status: RuntimeStatus): void => {
  update({
    runtimeStatuses: {
      ...extensionsState.runtimeStatuses,
      [status.id]: { ...status },
    },
  })
}

export const updateRuntimeStatus = (id: string, statusUpdate: Partial<RuntimeStatus>): void => {
  const previousStatus = extensionsState.runtimeStatuses[id] || createEmptyRuntimeStatus(id)
  setRuntimeStatus({
    ...previousStatus,
    ...statusUpdate,
    id,
  })
}

export const getRuntimeStatus = (extensionId: string): RuntimeStatus | undefined => {
  return extensionsState.runtimeStatuses[extensionId]
}

export const resetRuntimeStatuses = (): void => {
  update({ runtimeStatuses: Object.create(null) })
}