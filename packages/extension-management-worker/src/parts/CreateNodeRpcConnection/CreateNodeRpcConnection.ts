import { PlatformType } from '@lvce-editor/constants'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import { getNodeRpcInfo } from '../GetNodeRpcPath/GetNodeRpcPath.ts'

const isMissingRendererCommand = (error: unknown, command: string): boolean => {
  const moduleName = command.slice(0, command.indexOf('.'))
  return (
    error instanceof Error &&
    (error.message.includes(command) || error.message.includes(`module ${moduleName} not found`)) &&
    /command not found|not found/i.test(error.message)
  )
}

const createLegacyConnection = (): unknown => ({ type: 'legacy-proxy' })

export const createNodeRpcConnection = async (extensionId: string, rpcId: string): Promise<unknown> => {
  const { path } = await getNodeRpcInfo(extensionId, rpcId)
  const { platform } = ExtensionsState.get()
  if (platform === PlatformType.Remote) {
    try {
      const connectionInfo = await RendererWorker.invoke('ExtensionNodeRpc.createConnection', extensionId, rpcId, path)
      return { ...(connectionInfo as object), type: 'websocket' }
    } catch (error) {
      if (isMissingRendererCommand(error, 'ExtensionNodeRpc.createConnection')) {
        return createLegacyConnection()
      }
      throw error
    }
  }
  if (platform === PlatformType.Electron) {
    try {
      const supported = await RendererWorker.invoke('ExtensionNodeRpc.supportsDirectConnection')
      return supported ? { type: 'message-port' } : createLegacyConnection()
    } catch (error) {
      if (isMissingRendererCommand(error, 'ExtensionNodeRpc.supportsDirectConnection')) {
        return createLegacyConnection()
      }
      throw error
    }
  }
  throw new Error('Node rpc is not available on this platform')
}

export const createNodeRpcMessagePort = async (extensionId: string, rpcId: string, port: MessagePort): Promise<void> => {
  const { platform } = ExtensionsState.get()
  if (platform !== PlatformType.Electron) {
    throw new Error('Node rpc message ports are only available in Electron')
  }
  const { path } = await getNodeRpcInfo(extensionId, rpcId)
  await RendererWorker.invokeAndTransfer('ExtensionNodeRpc.createMessagePort', port, path)
}
