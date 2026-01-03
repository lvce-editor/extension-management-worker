import { PlatformType } from '@lvce-editor/constants'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import { getDynamicWebExtensions } from '../GetDynamicWebExtensions/GetDynamicWebExtensions.ts'
import { getWebExtensions } from '../GetWebExtensions/GetWebExtensions.ts'
import { get } from '../State/State.ts'

export const getAllExtensions = async (assetDir: string) => {
  const state = get()
  const meta = getDynamicWebExtensions()
  if (state.platform === PlatformType.Web) {
    const webExtensions = await getWebExtensions(assetDir)
    return [...webExtensions, ...meta]
  }
  const local = await SharedProcess.invoke('ExtensionManagement.getAllExtensions')
  return [...local, ...meta]
}
