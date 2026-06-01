import type { Rpc } from '@lvce-editor/rpc'

const rpcs = Object.create(null)

export const get = (extensionId: string): Rpc | undefined => {
  return rpcs[extensionId]
}

export const getAll = (): readonly Rpc[] => {
  return Object.values(rpcs)
}

export const set = (extensionId: string, rpc: Rpc): void => {
  rpcs[extensionId] = rpc
}

export const clear = (): void => {
  for (const key of Object.keys(rpcs)) {
    delete rpcs[key]
  }
}
