import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'
import { getNodeRpcInfo } from '../GetNodeRpcPath/GetNodeRpcPath.ts'

export const createExtensionCommandMap = (extensionId: string): Record<string, unknown> => {
  return {
    ...CommandMapRef.commandMapRef,
    'Extensions.getNodeRpcInfo'(rpcId: string) {
      return getNodeRpcInfo(extensionId, rpcId)
    },
  }
}
