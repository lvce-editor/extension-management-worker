import { RendererWorker } from '@lvce-editor/rpc-registry'
import * as DeclaredRpcState from '../DeclaredRpcState/DeclaredRpcState.ts'

const nodeRpcType = 'node'

const joinPath = (base: string, relativePath: string): string => {
  let normalizedBase = base.replaceAll('\\', '/')
  while (normalizedBase.endsWith('/')) {
    normalizedBase = normalizedBase.slice(0, -1)
  }
  const normalizedRelativePath = relativePath.replaceAll('\\', '/').replace(/^\.\//, '')
  return `${normalizedBase}/${normalizedRelativePath}`
}

const toFileSystemPath = (path: string): string => {
  if (!path.startsWith('file:')) {
    return path
  }
  const pathname = decodeURIComponent(new URL(path).pathname)
  return /^\/[A-Za-z]:\//.test(pathname) ? pathname.slice(1) : pathname
}

const getExtensionRoot = async (extension: DeclaredRpcState.ExtensionWithDeclaredRpcs): Promise<string> => {
  if (extension.builtin) {
    const builtinExtensionsPath = await RendererWorker.invoke('PlatformPaths.getBuiltinExtensionsPath')
    if (typeof builtinExtensionsPath !== 'string') {
      throw new TypeError('builtin extensions path must be a string')
    }
    return joinPath(builtinExtensionsPath, extension.id)
  }
  const extensionPath = extension.uri || extension.path || ''
  if (!extensionPath) {
    throw new Error(`Extension ${extension.id} has no path`)
  }
  return toFileSystemPath(extensionPath)
}

const getDeclaredNodeRpc = (extension: DeclaredRpcState.ExtensionWithDeclaredRpcs, rpcId: string): DeclaredRpcState.DeclaredRpc => {
  const rpc = extension.rpc.find((candidate) => candidate.id === rpcId)
  if (!rpc) {
    throw new Error(`Node rpc ${rpcId} is not declared by extension ${extension.id}`)
  }
  if (rpc.type !== nodeRpcType) {
    throw new Error(`Rpc ${rpcId} declared by extension ${extension.id} is not a node rpc`)
  }
  if (!rpc.url || rpc.url.startsWith('/') || /^[A-Za-z][A-Za-z\d+.-]*:/.test(rpc.url)) {
    throw new Error(`Node rpc ${rpcId} declared by extension ${extension.id} must use a relative url`)
  }
  return rpc
}

export interface NodeRpcInfo {
  readonly name: string
  readonly path: string
}

export const getNodeRpcInfo = async (extensionId: string, rpcId: string): Promise<NodeRpcInfo> => {
  const extension = DeclaredRpcState.get(extensionId)
  if (!extension) {
    throw new Error(`Extension ${extensionId} has no declared rpcs`)
  }
  const rpc = getDeclaredNodeRpc(extension, rpcId)
  const extensionRoot = await getExtensionRoot(extension)
  return {
    name: rpc.name || '',
    path: joinPath(extensionRoot, rpc.url),
  }
}

export const getNodeRpcPath = async (extensionId: string, rpcId: string): Promise<string> => {
  const info = await getNodeRpcInfo(extensionId, rpcId)
  return info.path
}
