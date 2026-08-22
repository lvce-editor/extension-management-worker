import * as DeclaredRpcState from '../DeclaredRpcState/DeclaredRpcState.ts'

export const validateNodeProcessRpc = (extensionId: string, rpcId: string): void => {
  const extension = DeclaredRpcState.get(extensionId)
  if (!extension) {
    throw new Error(`Extension ${extensionId} has no declared rpcs`)
  }
  const rpc = extension.rpc.find((candidate) => candidate.id === rpcId)
  if (!rpc) {
    throw new Error(`Node rpc ${rpcId} is not declared by extension ${extension.id}`)
  }
  if (rpc.type !== 'node-process') {
    throw new Error(`Rpc ${rpcId} declared by extension ${extension.id} is not a node process`)
  }
}
