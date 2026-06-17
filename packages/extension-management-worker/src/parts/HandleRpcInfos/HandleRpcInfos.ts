import * as ExtensionHostRpcState from '../ExtensionHostRpcState/ExtensionHostRpcState.ts'
import * as GetUrlPrefix from '../GetUrlPrefix/GetUrlPrefix.ts'

export const handleRpcInfos = (extension: any, platform: any): void => {
  try {
    if (!extension) {
      return
    }
    const rpcs = extension.rpc
    if (!rpcs) {
      return
    }
    if (!Array.isArray(rpcs)) {
      return
    }

    const urlPrefix = GetUrlPrefix.getUrlPrefix(platform, extension.path)
    for (const rpc of rpcs) {
      rpc.url = `${urlPrefix}/${rpc.url}`
      ExtensionHostRpcState.add(rpc.id, rpc)
    }
  } catch (error) {
    console.warn(`Failed to handle extension rpcs: ${error}`)
  }
}
