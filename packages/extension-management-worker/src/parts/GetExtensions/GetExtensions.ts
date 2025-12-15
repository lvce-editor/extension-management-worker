import { PlatformType } from '@lvce-editor/constants'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import { get } from '../State/State.ts'

export const getAllExtensions = async () => {
  const state = get()
  if (state.platform === PlatformType.Web) {
    return []
  }
  return SharedProcess.invoke('ExtensionManagement.getAllExtensions')
}
