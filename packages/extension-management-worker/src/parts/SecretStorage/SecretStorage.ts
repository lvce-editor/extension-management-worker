import * as Assert from '@lvce-editor/assert'
import { PlatformType } from '@lvce-editor/constants'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'

export const cacheName = 'ExtensionSecrets'

const getRequestUrl = (extensionId: string, key: string): string => {
  return `https://secret-storage.invalid/${encodeURIComponent(extensionId)}/${encodeURIComponent(key)}`
}

const isElectron = (): boolean => {
  return ExtensionsState.get().platform === PlatformType.Electron
}

export const deleteSecret = async (extensionId: string, key: string): Promise<void> => {
  Assert.string(extensionId)
  Assert.string(key)
  if (isElectron()) {
    await SharedProcess.invoke('SecretStorage.delete', extensionId, key)
    return
  }
  const cache = await caches.open(cacheName)
  await cache.delete(getRequestUrl(extensionId, key))
}

export const getSecret = async (extensionId: string, key: string): Promise<string | undefined> => {
  Assert.string(extensionId)
  Assert.string(key)
  if (isElectron()) {
    return SharedProcess.invoke('SecretStorage.get', extensionId, key)
  }
  const cache = await caches.open(cacheName)
  const response = await cache.match(getRequestUrl(extensionId, key))
  return response?.text()
}

export const storeSecret = async (extensionId: string, key: string, value: string): Promise<void> => {
  Assert.string(extensionId)
  Assert.string(key)
  Assert.string(value)
  if (isElectron()) {
    await SharedProcess.invoke('SecretStorage.store', extensionId, key, value)
    return
  }
  const cache = await caches.open(cacheName)
  await cache.put(getRequestUrl(extensionId, key), new Response(value))
}
