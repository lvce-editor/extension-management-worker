/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { Rpc } from '@lvce-editor/rpc'

export interface SerializedError {
  readonly message: string
  readonly name: string
  readonly stack?: string
}

export interface ReadyExtensionViewInstance {
  readonly context?: unknown
  readonly disposeWorkerWhenLastViewCloses?: boolean
  readonly extensionId?: string
  readonly rpc: Rpc
  readonly status: 'ready'
  readonly viewId: string
}

interface ErrorExtensionViewInstance {
  readonly error: SerializedError
  readonly status: 'error'
  readonly viewId: string
}

export type ExtensionViewInstance = ReadyExtensionViewInstance | ErrorExtensionViewInstance

const instances: Record<number, ExtensionViewInstance> = Object.create(null)

export const set = (uid: number, instance: ExtensionViewInstance): void => {
  instances[uid] = instance
}

export const get = (uid: number): ExtensionViewInstance | undefined => {
  return instances[uid]
}

export const getEntries = (): readonly { readonly instance: ExtensionViewInstance; readonly uid: number }[] => {
  return Object.entries(instances).map(([uid, instance]) => ({
    instance,
    uid: Number(uid),
  }))
}

export const remove = (uid: number): void => {
  delete instances[uid]
}

export const clear = (): void => {
  for (const uid of Object.keys(instances)) {
    delete instances[Number(uid)]
  }
}
