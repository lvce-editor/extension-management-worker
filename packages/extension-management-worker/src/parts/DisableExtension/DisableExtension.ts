import { disableExtension2 } from '../DisableExtension2/DisableExtension2.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'

export const disableExtension = async (id: string, isTest: boolean): Promise<unknown> => {
  const oldState = ExtensionsState.get()
  return disableExtension2(id, oldState.platform)
}
