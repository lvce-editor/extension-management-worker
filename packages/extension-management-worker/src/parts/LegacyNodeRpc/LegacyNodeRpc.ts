import { RendererWorker } from '@lvce-editor/rpc-registry'
import { getNodeRpcInfo, getNodeRpcType, legacyNodeRpcType } from '../GetNodeRpcPath/GetNodeRpcPath.ts'

interface LegacyNodeRpc {
  readonly extensionId: string
  readonly rendererRpcId: unknown
}

const rpcs = new Map<number, LegacyNodeRpc>()
const state = { nextId: 0 }

const getRpc = (extensionId: string, id: number): LegacyNodeRpc => {
  const rpc = rpcs.get(id)
  if (!rpc || rpc.extensionId !== extensionId) {
    throw new Error(`Node rpc ${id} not found`)
  }
  return rpc
}

export const create = async (extensionId: string, rpcId: string): Promise<number> => {
  if (getNodeRpcType(extensionId, rpcId) !== legacyNodeRpcType) {
    throw new Error(`Node rpc ${rpcId} is not a legacy node rpc`)
  }
  const { name, path } = await getNodeRpcInfo(extensionId, rpcId)
  const rendererRpcId = await RendererWorker.invoke('ExtensionNodeRpc.create', name, path)
  const id = ++state.nextId
  rpcs.set(id, { extensionId, rendererRpcId })
  return id
}

export const invoke = async (extensionId: string, id: number, method: string, ...params: readonly any[]): Promise<any> => {
  const { rendererRpcId } = getRpc(extensionId, id)
  return RendererWorker.invoke('ExtensionNodeRpc.invoke', rendererRpcId, method, ...params)
}

export const dispose = async (extensionId: string, id: number): Promise<void> => {
  const { rendererRpcId } = getRpc(extensionId, id)
  rpcs.delete(id)
  await RendererWorker.invoke('ExtensionNodeRpc.dispose', rendererRpcId)
}

export const clear = (): void => {
  rpcs.clear()
  state.nextId = 0
}
