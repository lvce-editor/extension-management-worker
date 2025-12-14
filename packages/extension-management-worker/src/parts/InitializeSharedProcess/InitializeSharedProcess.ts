import { PlatformType } from '@lvce-editor/constants'
import { WebSocketRpcParent2 } from '@lvce-editor/rpc'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'

export const initializeSharedProcess = async (platform: number) => {
  // TODO create connection to shared process
  if (platform === PlatformType.Remote) {
    const rpc = await WebSocketRpcParent2.create({
      commandMap: CommandMapRef.commandMapRef,
      type: 'shared-process',
    })
    SharedProcess.set(rpc)
  } else if (platform === PlatformType.Electron) {
    // TODO messageport rpc
  }
}
