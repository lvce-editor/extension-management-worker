import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'

export const getDynamicWebExtensions = (): readonly any[] => {
  return ExtensionsState.get().webExtensions
}
