import type { Rpc } from '@lvce-editor/rpc'
import { PlatformType } from '@lvce-editor/constants'
import { TransferMessagePortRpcParent, WebSocketRpcParent2 } from '@lvce-editor/rpc'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'

const getRpcRemote = async () => {
  const rpc = await WebSocketRpcParent2.create({
    commandMap: CommandMapRef.commandMapRef,
    type: 'shared-process',
  })
  return rpc
}

const getRpcElectron = async () => {
  const rpc = TransferMessagePortRpcParent.create({
    commandMap: CommandMapRef.commandMapRef,
    async send(port) {
      await RendererWorker.sendMessagePortToSharedProcess(port)
    },
  })
  return rpc
}

const getRpc = async (platform: number): Promise<Rpc | undefined> => {
  // TODO create connection to shared process
  if (platform === PlatformType.Remote) {
    return getRpcRemote()
  }
  if (platform === PlatformType.Electron) {
    return getRpcElectron()
  }
  return undefined
}

export const initializeSharedProcess = async (platform: number) => {
  const rpc = await getRpc(platform)
  if (rpc) {
    SharedProcess.set(rpc)
  }
}
