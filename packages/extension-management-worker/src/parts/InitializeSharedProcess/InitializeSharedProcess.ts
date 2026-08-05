import type { Rpc } from '@lvce-editor/rpc'
import { PlatformType } from '@lvce-editor/constants'
import { TransferMessagePortRpcParent, WebSocketRpcParent, WebSocketRpcParent2 } from '@lvce-editor/rpc'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'

export interface SharedProcessDependencies {
  readonly createLegacyWebSocketRpc: typeof WebSocketRpcParent2.create
  readonly createTransferMessagePortRpc: typeof TransferMessagePortRpcParent.create
  readonly createWebSocket: (url: string, protocols: readonly string[]) => WebSocket
  readonly createWebSocketRpc: typeof WebSocketRpcParent.create
  readonly invokeRenderer: typeof RendererWorker.invoke
  readonly sendMessagePortToSharedProcess: typeof RendererWorker.sendMessagePortToSharedProcess
  readonly setSharedProcess: typeof SharedProcess.set
}

const defaultDependencies: SharedProcessDependencies = {
  createLegacyWebSocketRpc: WebSocketRpcParent2.create,
  createTransferMessagePortRpc: TransferMessagePortRpcParent.create,
  createWebSocket(url, protocols) {
    return new WebSocket(url, [...protocols])
  },
  createWebSocketRpc: WebSocketRpcParent.create,
  invokeRenderer: RendererWorker.invoke,
  sendMessagePortToSharedProcess: RendererWorker.sendMessagePortToSharedProcess,
  setSharedProcess: SharedProcess.set,
}

const getRpcRemote = async (dependencies: SharedProcessDependencies) => {
  try {
    const { protocols, url } = (await dependencies.invokeRenderer('WebSocketCapability.create', 'shared-process')) as {
      readonly protocols: string[]
      readonly url: string
    }
    const webSocket = dependencies.createWebSocket(url, protocols)
    return dependencies.createWebSocketRpc({
      commandMap: CommandMapRef.commandMapRef,
      webSocket,
    })
  } catch (error) {
    if (!(
      error instanceof Error &&
      (error.message.includes('WebSocketCapability.create') || error.message.includes('module WebSocketCapability not found')) &&
      /command not found|not found/i.test(error.message)
    )) {
      throw error
    }
  }
  return dependencies.createLegacyWebSocketRpc({
    commandMap: CommandMapRef.commandMapRef,
    type: 'shared-process',
  })
}

const getRpcElectron = async (dependencies: SharedProcessDependencies) => {
  const rpc = dependencies.createTransferMessagePortRpc({
    commandMap: CommandMapRef.commandMapRef,
    async send(port) {
      await dependencies.sendMessagePortToSharedProcess(port)
    },
  })
  return rpc
}

const getRpc = async (platform: number, dependencies: SharedProcessDependencies): Promise<Rpc | undefined> => {
  // TODO create connection to shared process
  if (platform === PlatformType.Remote) {
    return getRpcRemote(dependencies)
  }
  if (platform === PlatformType.Electron) {
    return getRpcElectron(dependencies)
  }
  return undefined
}

export const initializeSharedProcess = async (platform: number, dependencies: SharedProcessDependencies = defaultDependencies) => {
  const rpc = await getRpc(platform, dependencies)
  if (rpc) {
    dependencies.setSharedProcess(rpc)
  }
}
