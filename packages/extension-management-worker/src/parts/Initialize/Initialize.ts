import { initializeSharedProcess } from '../InitializeSharedProcess/InitializeSharedProcess.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'

export const initialize = async (platform: number) => {
  ExtensionsState.setPlatform(platform)
  await initializeSharedProcess(platform)
}
