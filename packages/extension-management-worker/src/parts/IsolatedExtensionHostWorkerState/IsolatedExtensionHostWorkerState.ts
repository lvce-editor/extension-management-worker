import type { Rpc } from '@lvce-editor/rpc'

const rpcs = Object.create(null)

export const get = (extensionId: string): Rpc | undefined => {
  return rpcs[extensionId]
}

export const set = (extensionId: string, rpc: Rpc): void => {
  rpcs[extensionId] = rpc
}
