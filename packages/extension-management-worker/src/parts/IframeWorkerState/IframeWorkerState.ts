import type { Rpc } from '@lvce-editor/rpc'

let rpc: Rpc | undefined

export const get = (): Rpc => {
  if (!rpc) {
    throw new Error('Iframe worker rpc not initialized')
  }
  return rpc
}

export const set = (newRpc: Rpc): void => {
  rpc = newRpc
}

export const clear = (): void => {
  rpc = undefined
}
