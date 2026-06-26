import type { Rpc } from '@lvce-editor/rpc'

const state: { rpc: Rpc | undefined } = {
  rpc: undefined,
}

export const set = (newRpc: Rpc): void => {
  state.rpc = newRpc
}
