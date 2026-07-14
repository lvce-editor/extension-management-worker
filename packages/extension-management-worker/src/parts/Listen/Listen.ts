import * as CommandMap from '../CommandMap/CommandMap.ts'
import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'
import { initializeAuthWorker } from '../InitializeAuthWorker/InitializeAuthWorker.ts'
import { initializeErrorWorker } from '../InitializeErrorWorker/InitializeErrorWorker.ts'
import { initializeExtensionHostWorker } from '../InitializeExtensionHostWorker/InitializeExtensionHostWorker.ts'
import { initializeFileSystemWorker } from '../InitializeFileSystemWorker/InitializeFileSystemWorker.ts'
import { initializeIframeWorker } from '../InitializeIframeWorker/InitializeIframeWorker.ts'
import { initializeRendererWorker } from '../InitializeRendererWorker/InitializeRendererWorker.ts'

export const listen = async (): Promise<void> => {
  Object.assign(CommandMapRef.commandMapRef, CommandMap.commandMap)
  await Promise.all([
    initializeRendererWorker(),
    initializeAuthWorker(),
    initializeErrorWorker(),
    initializeFileSystemWorker(),
    initializeIframeWorker(),
    initializeExtensionHostWorker(),
  ])
}
