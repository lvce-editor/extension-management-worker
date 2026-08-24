import { RendererWorker } from '@lvce-editor/rpc-registry'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import { initializeSharedProcess } from '../InitializeSharedProcess/InitializeSharedProcess.ts'
import * as LinkedExtensionHotReload from '../LinkedExtensionHotReload/LinkedExtensionHotReload.ts'

interface DevelopmentConfig {
  readonly extensions?: readonly { readonly path: string; readonly uri: string }[]
  readonly hotReload?: boolean
}

interface InitializeDependencies {
  readonly configureHotReload: typeof LinkedExtensionHotReload.configure
  readonly initializeSharedProcess: typeof initializeSharedProcess
  readonly invokeRenderer: typeof RendererWorker.invoke
}

const defaultDependencies: InitializeDependencies = {
  configureHotReload: LinkedExtensionHotReload.configure,
  initializeSharedProcess,
  invokeRenderer: RendererWorker.invoke,
}

export const initialize = async (platform: number, developmentConfig: DevelopmentConfig = {}, dependencies = defaultDependencies) => {
  ExtensionsState.setPlatform(platform)
  await dependencies.initializeSharedProcess(platform)
  const extensions = developmentConfig.extensions || []
  dependencies.configureHotReload(extensions)
  if (developmentConfig.hotReload && extensions.length > 0) {
    await dependencies.invokeRenderer('ExtensionHotReload.watch', extensions)
  }
}
