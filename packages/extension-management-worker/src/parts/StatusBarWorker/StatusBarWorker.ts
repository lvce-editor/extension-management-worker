const state = {
  rpc: undefined as any,
}

export const set = (value: any): void => {
  state.rpc = value
}

export const invoke = async (method: string, ...params: readonly any[]): Promise<any> => {
  if (!state.rpc) {
    return undefined
  }
  return state.rpc.invoke(method, ...params)
}
