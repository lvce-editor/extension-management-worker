import { state } from '../ExtensionMetaState/ExtensionMetaState.ts'

export const getDynamicWebExtensions = async (assetDir: string) => {
  return state.webExtensions
}
