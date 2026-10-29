import { RendererWorker } from '@lvce-editor/rpc-registry'
import * as CommandMap from '../CommandMap/CommandMap.ts'
import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'
import { initializeAuthWorker } from '../InitializeAuthWorker/InitializeAuthWorker.ts'
import { initializeCacheWorker } from '../InitializeCacheWorker/InitializeCacheWorker.ts'
import { initializeErrorWorker } from '../InitializeErrorWorker/InitializeErrorWorker.ts'
import { initializeFileSystemWorker } from '../InitializeFileSystemWorker/InitializeFileSystemWorker.ts'
import { initializeIframeWorker } from '../InitializeIframeWorker/InitializeIframeWorker.ts'

export const listen = async (): Promise<void> => {
  Object.assign(CommandMapRef.commandMapRef, CommandMap.commandMap)
  await Promise.all([
    RendererWorker.initializeRendererWorkerForWorker(CommandMap.commandMap),
    initializeAuthWorker(),
    initializeCacheWorker(),
    initializeErrorWorker(),
    initializeFileSystemWorker(),
    initializeIframeWorker(),
  ])
}
