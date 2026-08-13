import type { Rpc } from '@lvce-editor/rpc'

const state: { rpc: Rpc | undefined } = { rpc: undefined }

export const set = (value: Rpc): void => {
  state.rpc = value
}

export const invoke = async (method: string, ...params: readonly unknown[]): Promise<void> => {
  await state.rpc?.invoke(method, ...params)
}
