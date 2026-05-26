import { PlatformType } from '@lvce-editor/constants'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import * as GetWebExtensions from '../GetWebExtensions/GetWebExtensions.ts'
import * as Rpc from '../Rpc/Rpc.ts'

const getSharedProcessExtensions = (): Promise<readonly any[]> => {
  return Rpc.invoke(/* ExtensionManagement.getExtensions */ 'ExtensionManagement.getExtensions')
}

export const doGetExtensions = async (assetDir: string, platform: number) => {
  const meta = ExtensionsState.get().webExtensions
  if (platform === PlatformType.Web) {
    const webExtensions = await GetWebExtensions.getWebExtensions(assetDir)
    return [...webExtensions, ...meta]
  }
  if (platform === PlatformType.Remote) {
    const sharedProcessExtensions = await getSharedProcessExtensions()
    return [...sharedProcessExtensions, ...meta]
  }
  const extensions = await getSharedProcessExtensions()
  return extensions
}
