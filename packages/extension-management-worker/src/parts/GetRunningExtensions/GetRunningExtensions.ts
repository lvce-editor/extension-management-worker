import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import { getAllExtensions } from '../GetExtensions/GetExtensions.ts'
import { getRunningExtensionsFromState } from '../GetRunningExtensionsFromState/GetRunningExtensionsFromState.ts'

export const getRunningExtensions = async (assetDir: string, platform: number): Promise<readonly any[]> => {
  const extensions = await getAllExtensions(assetDir, platform)
  const { runtimeStatuses } = ExtensionsState.get()
  return getRunningExtensionsFromState(extensions, runtimeStatuses)
}
