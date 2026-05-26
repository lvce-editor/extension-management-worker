import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import { initializeSharedProcess } from '../InitializeSharedProcess/InitializeSharedProcess.ts'

export const initialize = async (platform: number) => {
  ExtensionsState.setPlatform(platform)
  await initializeSharedProcess(platform)
}
