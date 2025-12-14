import { initializeFileSystemWorker } from '../InitializeFileSystemWorker/InitializeFileSystemWorker.ts'
import { initializeSharedProcess } from '../InitializeSharedProcess/InitializeSharedProcess.ts'
import * as State from '../State/State.ts'

export const initialize = async (platform: number) => {
  State.update({ platform })
  await Promise.all([initializeFileSystemWorker(), initializeSharedProcess(platform)])
}
