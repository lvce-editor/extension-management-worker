import * as DeclaredRpcState from '../DeclaredRpcState/DeclaredRpcState.ts'
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

    if (typeof extension.id === 'string') {
      DeclaredRpcState.set({
        ...extension,
        rpc: rpcs.map((rpc) => ({ ...rpc })),
      })
    }

    const urlPrefix = GetUrlPrefix.getUrlPrefix(platform, extension.path)
    for (const rpc of rpcs) {
      if (rpc.type === 'node') {
        continue
      }
      rpc.url = `${urlPrefix}/${rpc.url}`
      ExtensionHostRpcState.add(rpc.id, rpc)
    }
  } catch (error) {
    console.warn(`Failed to handle extension rpcs: ${error}`)
  }
}
