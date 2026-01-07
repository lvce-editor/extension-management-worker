import * as Assert from '@lvce-editor/assert'
import { PlatformType } from '@lvce-editor/constants'
import { FileSystemWorker, RendererWorker } from '@lvce-editor/rpc-registry'
import * as ExtensionStorage from '../ExtensionStorage/ExtensionStorage.ts'

export const enableExtension2 = async (id: string, platform: number): Promise<unknown> => {
  Assert.string(id)
  Assert.number(platform)
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
  await ExtensionStorage.enableextension2(id, platform)
  return undefined
}
