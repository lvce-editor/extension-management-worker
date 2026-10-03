import { CacheWorker } from '@lvce-editor/rpc-registry'

export const getCacheFileHandle = async (extensionId: string, name: string): Promise<FileSystemFileHandle> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(extensionId))
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return CacheWorker.invoke('Opfs.getCacheFileHandle', `extension-${hash}`, name)
}
