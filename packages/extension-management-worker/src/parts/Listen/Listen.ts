import * as CommandMap from '../CommandMap/CommandMap.ts'
import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'
import { setFactory } from '../IframeWorker/IframeWorker.ts'
import { initializeRendererWorker } from '../InitializeRendererWorker/InitializeRendererWorker.ts'
import { launchIframeWorker } from '../LaunchIframeWorker/LaunchIframeWorker.ts'

export const listen = async (): Promise<void> => {
  setFactory(launchIframeWorker)
  Object.assign(CommandMapRef.commandMapRef, CommandMap.commandMap)
  await initializeRendererWorker()
}
