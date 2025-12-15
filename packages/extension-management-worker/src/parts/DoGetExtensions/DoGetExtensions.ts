import * as ExtensionMetaState from '../ExtensionMetaState/ExtensionMetaState.ts'
import * as GetWebExtensions from '../GetWebExtensions/GetWebExtensions.ts'
import * as Platform from '../Platform/Platform.ts'
import * as PlatformType from '../PlatformType/PlatformType.ts'
import * as Rpc from '../Rpc/Rpc.ts'

const getSharedProcessExtensions = (): Promise<readonly any[]> => {
  return Rpc.invoke(/* ExtensionManagement.getExtensions */ 'ExtensionManagement.getExtensions')
}

export const doGetExtensions = async () => {
  const meta = ExtensionMetaState.state.webExtensions
  if (Platform.platform === PlatformType.Web) {
    const webExtensions = await GetWebExtensions.getWebExtensions()
    return [...webExtensions, ...meta]
  }
  if (Platform.platform === PlatformType.Remote) {
    const sharedProcessExtensions = await getSharedProcessExtensions()
    return [...sharedProcessExtensions, ...meta]
  }
  const extensions = await getSharedProcessExtensions()
  return extensions
}
