import { WebWorkerRpcClient } from '@lvce-editor/rpc'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import * as CommandMap from '../CommandMap/CommandMap.ts'
import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'
import { setFactory } from '../IframeWorker/IframeWorker.ts'
import { launchIframeWorker } from '../LaunchIframeWorker/LaunchIframeWorker.ts'

export const listen = async (): Promise<void> => {
  setFactory(launchIframeWorker)
  Object.assign(CommandMapRef.commandMapRef, CommandMap.commandMap)
  const rpc = await WebWorkerRpcClient.create({
    commandMap: CommandMap.commandMap,
  })
  RendererWorker.set(rpc)
}
