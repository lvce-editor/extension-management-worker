import { enableExtension2 } from '../EnableExtension2/EnableExtension2.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'

export const enableExtension = async (id: string, isTest: boolean): Promise<unknown> => {
  const oldState = ExtensionsState.get()
  return enableExtension2(id, oldState.platform)
}
