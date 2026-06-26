const rpcs = Object.create(null)

export const add = (id: string, rpc: any) => {
  rpcs[id] = rpc
}

export const get = (id: string) => {
  return rpcs[id]
}
