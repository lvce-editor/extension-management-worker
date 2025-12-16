import { state } from '../ExtensionMetaState/ExtensionMetaState.ts'

export const getDynamicWebExtensions = (): readonly any[] => {
  return state.webExtensions
}
