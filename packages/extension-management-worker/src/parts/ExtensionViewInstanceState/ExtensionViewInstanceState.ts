import type { Rpc } from '@lvce-editor/rpc'

interface ExtensionViewInstance {
  readonly rpc: Rpc
  readonly viewId: string
}

const instances: Record<number, ExtensionViewInstance> = Object.create(null)

export const set = (uid: number, instance: ExtensionViewInstance): void => {
  instances[uid] = instance
}

export const get = (uid: number): ExtensionViewInstance | undefined => {
  return instances[uid]
}

export const remove = (uid: number): void => {
  delete instances[uid]
}

export const clear = (): void => {
  for (const uid of Object.keys(instances)) {
    delete instances[Number(uid)]
  }
}
