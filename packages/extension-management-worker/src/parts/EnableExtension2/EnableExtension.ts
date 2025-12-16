import { PlatformType } from '@lvce-editor/constants'
import { FileSystemWorker, RendererWorker } from '@lvce-editor/rpc-registry'
import * as State from '../State/State.ts'

export const enableExtension2 = async (id: string, platform: number): Promise<unknown> => {
  const isTest = platform === PlatformType.Test
  const oldState = State.get()
  if (platform === PlatformType.Remote || platform === PlatformType.Electron) {
    const disabledExtensionsJsonPath = await RendererWorker.invoke('PlatformPaths.getBuiltinExtensionsJsonPath')
    const exists = await FileSystemWorker.exists(disabledExtensionsJsonPath)
    if (!exists) {
      return undefined
    }
    const content = await FileSystemWorker.readFile(disabledExtensionsJsonPath)
    const parsed = JSON.parse(content)
    const oldDisabled = parsed.disabledExtensions || []
    const newDisabled = oldDisabled.filter((item: any) => item !== id)
    const newData = {
      disabledExtensions: newDisabled,
    }
    const newContent = JSON.stringify(newData, null, 2) + '\n'
    await FileSystemWorker.writeFile(disabledExtensionsJsonPath, newContent)
  }
  if (isTest) {
    const newState: State.State = {
      ...oldState,
      disabledIds: oldState.disabledIds.filter((existing) => existing !== id),
    }
    State.set(newState)
  }
  return undefined
}
