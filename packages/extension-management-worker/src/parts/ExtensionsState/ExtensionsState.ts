/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { RuntimeStatus } from '../RuntimeStatus/RuntimeStatus.ts'
import * as RuntimeStatusType from '../RuntimeStatusType/RuntimeStatusType.ts'

export interface ExtensionsState {
  readonly activatedExtensions: Readonly<Record<string, Promise<void>>>
  readonly applicationGeneration?: number | undefined
  readonly applicationId?: string | undefined
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

const state = {
  extensionsState: createInitialState(),
  nextApplicationGeneration: 0,
}

const applications = new Map<string, ExtensionsState>()

export const createApplication = (applicationId: string, platform: number, webExtensions: readonly any[]): void => {
  if (!applicationId || applications.has(applicationId)) {
    throw new Error(`Invalid or duplicate extension application: ${applicationId}`)
  }
  applications.set(applicationId, {
    ...createInitialState(),
    applicationGeneration: ++state.nextApplicationGeneration,
    applicationId,
    platform,
    webExtensions: [...webExtensions],
  })
}

export const removeApplication = (applicationId: string): void => {
  applications.delete(applicationId)
}

export const isCurrentApplication = (application: Pick<ExtensionsState, 'applicationId' | 'applicationGeneration'>): boolean => {
  if (application.applicationId === undefined) {
    return true
  }
  const current = applications.get(application.applicationId)
  return current !== undefined && current.applicationGeneration === application.applicationGeneration
}

export const assertCurrentApplication = (application: Pick<ExtensionsState, 'applicationId' | 'applicationGeneration'>): void => {
  if (!isCurrentApplication(application)) {
    throw new Error(`Stale extension application: ${application.applicationId}`)
  }
}

export const get = (applicationId?: string): ExtensionsState => {
  if (applicationId !== undefined) {
    const application = applications.get(applicationId)
    if (!application) {
      throw new Error(`Extension application not found: ${applicationId}`)
    }
    return application
  }
  return state.extensionsState
}

export const set = (newState: ExtensionsState): void => {
  if (newState.applicationId !== undefined) {
    const currentState = get(newState.applicationId)
    if (newState.applicationGeneration !== currentState.applicationGeneration) {
      throw new Error(`Stale extension application state: ${newState.applicationId}`)
    }
    applications.set(newState.applicationId, newState)
    return
  }
  state.extensionsState = newState
}

export const update = (newState: Partial<Omit<ExtensionsState, 'applicationId' | 'applicationGeneration'>>, applicationId?: string): void => {
  if (Object.hasOwn(newState, 'applicationId') || Object.hasOwn(newState, 'applicationGeneration')) {
    throw new Error('Cannot change extension application identity')
  }
  const current = get(applicationId)
  set({
    ...current,
    ...newState,
  })
}

export const reset = (): void => {
  state.extensionsState = createInitialState()
}

export const setPlatform = (platform: number, applicationId?: string): void => {
  update({ platform }, applicationId)
}

export const hasWebExtensionUri = (uri: string, applicationId?: string): boolean => {
  return get(applicationId).webExtensions.some((extension) => extension.uri === uri)
}

export const setWebExtensions = (webExtensions: readonly any[], applicationId?: string): void => {
  update({ webExtensions }, applicationId)
}

export const addExtension = (extension: any, applicationId?: string): void => {
  update(
    {
      webExtensions: [...get(applicationId).webExtensions, extension],
    },
    applicationId,
  )
}

export const removeWebExtension = (id: string, applicationId?: string): boolean => {
  const currentState = get(applicationId)
  const webExtensions = currentState.webExtensions.filter((extension) => extension.id !== id)
  if (webExtensions.length === currentState.webExtensions.length) {
    return false
  }
  update(
    {
      cachedExtensions: undefined,
      webExtensions,
    },
    applicationId,
  )
  return true
}

export const clearCachedExtensions = (applicationId?: string): void => {
  update({ cachedExtensions: undefined }, applicationId)
}

export const setRuntimeStatus = (status: RuntimeStatus, applicationId?: string): void => {
  update(
    {
      runtimeStatuses: {
        ...get(applicationId).runtimeStatuses,
        [status.id]: { ...status },
      },
    },
    applicationId,
  )
}

export const updateRuntimeStatus = (id: string, statusUpdate: Partial<RuntimeStatus>, applicationId?: string): void => {
  const previousStatus = get(applicationId).runtimeStatuses[id] || createEmptyRuntimeStatus(id)
  setRuntimeStatus(
    {
      ...previousStatus,
      ...statusUpdate,
      id,
    },
    applicationId,
  )
}

export const getRuntimeStatus = (extensionId: string, applicationId?: string): RuntimeStatus | undefined => {
  return get(applicationId).runtimeStatuses[extensionId]
}

const omit = <T>(record: Readonly<Record<string, T>>, id: string): Readonly<Record<string, T>> => {
  const result = { ...record }
  delete result[id]
  return result
}

export const resetExtensionRuntimeState = (extensionId: string, applicationId?: string): void => {
  const currentState = get(applicationId)
  update(
    {
      activatedExtensions: omit(currentState.activatedExtensions, extensionId),
      cachedActivationEvents: omit(currentState.cachedActivationEvents, extensionId),
      runtimeStatuses: omit(currentState.runtimeStatuses, extensionId),
    },
    applicationId,
  )
}

export const resetRuntimeState = (applicationId?: string): void => {
  update(
    {
      activatedExtensions: Object.create(null),
      cachedActivationEvents: Object.create(null),
      runtimeStatuses: Object.create(null),
    },
    applicationId,
  )
}
