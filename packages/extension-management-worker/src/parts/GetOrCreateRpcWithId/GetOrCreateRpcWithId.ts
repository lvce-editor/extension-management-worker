/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import * as Assert from '@lvce-editor/assert'
import * as CreateRpcWithId from '../CreateRpcWithId/CreateRpcWithId.ts'
import * as RpcState from '../RpcState/RpcState.ts'

const getOrCreateRpc = async (id: string, commandMap: any, execute?: any) => {
  const rpc = RpcState.get(id)
  if (!rpc) {
    RpcState.set(id, CreateRpcWithId.createRpcWithId(id, commandMap, execute))
  }
  return RpcState.get(id)
}

export const createRpcWithId = ({ commandMap, execute, id }: { id: string; commandMap: any; execute?: any }) => {
  Assert.string(id)
  RpcState.register(id, commandMap)
  const lazyRpc = {
    async invoke(method: string, ...params: readonly any[]) {
      const rpc = await getOrCreateRpc(id, commandMap, execute)
      return rpc.invoke(method, ...params)
    },
  }
  return lazyRpc
}
