import { disableExtension2 } from '../DisableExtension2/DisableExtension2.ts'
import * as State from '../State/State.ts'

export const disableExtension = async (id: string, isTest: boolean): Promise<unknown> => {
  const oldState = State.get()
  return disableExtension2(id, oldState.platform)
}
