import * as Assert from '@lvce-editor/assert'
import { PlatformType } from '@lvce-editor/constants'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import { getDynamicWebExtensions } from '../GetDynamicWebExtensions/GetDynamicWebExtensions.ts'
import { getWebExtensions } from '../GetWebExtensions/GetWebExtensions.ts'

export const getAllExtensions = async (assetDir: string, platform: number) => {
  Assert.string(assetDir)
  Assert.number(platform)
  const meta = getDynamicWebExtensions()
  if (platform === PlatformType.Web) {
    const webExtensions = await getWebExtensions(assetDir)
    return [...webExtensions, ...meta]
  }
  const local = await SharedProcess.invoke('ExtensionManagement.getAllExtensions')
  return [...local, ...meta]
}
