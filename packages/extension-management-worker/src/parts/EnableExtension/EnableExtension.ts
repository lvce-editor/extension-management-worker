import { enableExtension2 } from '../EnableExtension2/EnableExtension2.ts'
import * as State from '../State/State.ts'

export const enableExtension = async (id: string, isTest: boolean): Promise<unknown> => {
  const oldState = State.get()
  return enableExtension2(id, oldState.platform)
}
