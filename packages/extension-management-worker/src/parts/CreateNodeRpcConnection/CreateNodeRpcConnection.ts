import { PlatformType } from '@lvce-editor/constants'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import { getNodeRpcType, legacyNodeRpcType } from '../GetNodeRpcPath/GetNodeRpcPath.ts'

const isMissingRendererCommand = (error: unknown, command: string): boolean => {
  const moduleName = command.slice(0, command.indexOf('.'))
  return (
    error instanceof Error &&
    (error.message.includes(command) || error.message.includes(`module ${moduleName} not found`)) &&
    /command not found|not found/i.test(error.message)
  )
}

const createLegacyConnection = (): unknown => ({ type: 'legacy-proxy' })

const createUnsupportedDirectLaunchError = (rpcId: string): Error => {
  return new Error(`Node process ${rpcId} requires direct renderer support`)
}

const createRemoteConnection = async (extensionId: string, rpcId: string): Promise<unknown> => {
  try {
    const connectionInfo = await RendererWorker.invoke('ExtensionNodeRpc.createConnection', extensionId, rpcId)
    return { ...(connectionInfo as object), type: 'websocket' }
  } catch (error) {
    if (isMissingRendererCommand(error, 'ExtensionNodeRpc.createConnection')) {
      throw createUnsupportedDirectLaunchError(rpcId)
    }
    throw error
  }
}

const createElectronConnection = async (rpcId: string): Promise<unknown> => {
  try {
    const supported = await RendererWorker.invoke('ExtensionNodeRpc.supportsDirectConnection')
    if (!supported) {
      throw createUnsupportedDirectLaunchError(rpcId)
    }
    return { type: 'message-port' }
  } catch (error) {
    if (isMissingRendererCommand(error, 'ExtensionNodeRpc.supportsDirectConnection')) {
      throw createUnsupportedDirectLaunchError(rpcId)
    }
    throw error
  }
}

export const createNodeRpcConnection = async (extensionId: string, rpcId: string): Promise<unknown> => {
  const rpcType = getNodeRpcType(extensionId, rpcId)
  const { platform } = ExtensionsState.get()
  if (platform !== PlatformType.Remote && platform !== PlatformType.Electron) {
    throw new Error('Node rpc is not available on this platform')
  }
  if (rpcType === legacyNodeRpcType) {
    return createLegacyConnection()
  }
  if (platform === PlatformType.Remote) {
    return createRemoteConnection(extensionId, rpcId)
  }
  return createElectronConnection(rpcId)
}

export const createNodeRpcMessagePort = async (extensionId: string, rpcId: string, port: MessagePort): Promise<void> => {
  const { platform } = ExtensionsState.get()
  if (platform !== PlatformType.Electron) {
    throw new Error('Node rpc message ports are only available in Electron')
  }
  const rpcType = getNodeRpcType(extensionId, rpcId)
  if (rpcType === legacyNodeRpcType) {
    throw new Error(`Node rpc ${rpcId} is not a node process`)
  }
  await RendererWorker.invokeAndTransfer('ExtensionNodeRpc.createMessagePort', port, extensionId, rpcId)
}
