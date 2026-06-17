import type { Rpc } from '@lvce-editor/rpc'

const state: { rpc: Rpc | undefined } = {
  rpc: undefined,
}

export const get = (): Rpc => {
  if (!state.rpc) {
    throw new Error('Iframe worker rpc not initialized')
  }
  return state.rpc
}

export const set = (newRpc: Rpc): void => {
  state.rpc = newRpc
}

export const clear = (): void => {
  state.rpc = undefined
}
