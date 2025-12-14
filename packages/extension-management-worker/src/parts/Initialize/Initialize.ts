import { initializeSharedProcess } from '../InitializeSharedProcess/InitializeSharedProcess.ts'

export const initialize = async (platform: number) => {
  await initializeSharedProcess(platform)
}
