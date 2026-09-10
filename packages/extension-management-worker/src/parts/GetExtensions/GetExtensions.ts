import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import { getAllExtensionsWithState } from '../GetAllExtensionsWithState/GetAllExtensionsWithState.ts'

export const getAllExtensions = async (assetDir: string, platform: number, fields?: readonly string[]) => {
  return getAllExtensionsWithState(ExtensionsState.get(), assetDir, platform, fields)
}
