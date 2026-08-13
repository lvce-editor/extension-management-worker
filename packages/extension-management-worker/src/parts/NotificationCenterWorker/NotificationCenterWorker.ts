import type { Rpc } from '@lvce-editor/rpc'

const state: { rpc: Rpc | undefined } = { rpc: undefined }

export const set = (value: Rpc): void => {
  state.rpc = value
}
