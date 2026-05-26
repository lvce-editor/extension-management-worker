import * as ExtensionMetaState from '../ExtensionMetaState/ExtensionMetaState.ts'

export const getDynamicWebExtensions = (): readonly any[] => {
  return ExtensionMetaState.get()
}
