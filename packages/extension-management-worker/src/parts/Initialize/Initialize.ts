import { initializeSharedProcess } from '../InitializeSharedProcess/InitializeSharedProcess.ts'
import * as State from '../State/State.ts'

export const initialize = async (platform: number) => {
  State.update({ platform })
  await initializeSharedProcess(platform)
}
