let rpc: any

export const set = (value: any): void => {
  rpc = value
}

export const invoke = async (method: string, ...params: readonly any[]): Promise<any> => {
  if (!rpc) {
    return undefined
  }
  return rpc.invoke(method, ...params)
}
