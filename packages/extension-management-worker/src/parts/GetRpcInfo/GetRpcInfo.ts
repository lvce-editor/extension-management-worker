import * as ExtensionHostRpcState from '../ExtensionHostRpcState/ExtensionHostRpcState.ts'

export const getRpcInfo = (rpcId: string): any => {
  const info = ExtensionHostRpcState.get(rpcId)
  if (!info) {
    throw new Error(`Rpc not found ${rpcId}`)
  }
  return info
}
