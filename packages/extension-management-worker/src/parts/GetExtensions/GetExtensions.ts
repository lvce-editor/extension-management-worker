import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import { getAllExtensionsWithState } from '../GetAllExtensionsWithState/GetAllExtensionsWithState.ts'

export const getAllExtensions = async (assetDir: string, platform: number) => {
  return getAllExtensionsWithState(ExtensionsState.get(), assetDir, platform)
}
