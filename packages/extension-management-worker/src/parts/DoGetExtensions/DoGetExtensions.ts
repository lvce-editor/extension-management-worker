import { PlatformType } from '@lvce-editor/constants'
import * as ExtensionMetaState from '../ExtensionMetaState/ExtensionMetaState.ts'
import * as GetWebExtensions from '../GetWebExtensions/GetWebExtensions.ts'
import * as Rpc from '../Rpc/Rpc.ts'

const getSharedProcessExtensions = (): Promise<readonly any[]> => {
  return Rpc.invoke(/* ExtensionManagement.getExtensions */ 'ExtensionManagement.getExtensions')
}

export const doGetExtensions = async (assetDir: string, platform: number) => {
  const meta = ExtensionMetaState.state.webExtensions
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
