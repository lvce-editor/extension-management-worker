import * as Assert from '@lvce-editor/assert'
import { PlatformType } from '@lvce-editor/constants'
import { CacheWorker, MainProcess } from '@lvce-editor/rpc-registry'
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
    await MainProcess.invoke('SecretStorage.delete', extensionId, key)
    return
  }
  await CacheWorker.removeCacheStorageItem(getRequestUrl(extensionId, key), cacheName)
}

export const getSecret = async (extensionId: string, key: string): Promise<string | undefined> => {
  Assert.string(extensionId)
  Assert.string(key)
  if (isElectron()) {
    return MainProcess.invoke('SecretStorage.get', extensionId, key)
  }
  const item = await CacheWorker.getCacheStorageItem(getRequestUrl(extensionId, key), cacheName)
  if (!item) {
    return undefined
  }
  const body = item.body as string | ArrayBuffer
  return typeof body === 'string' ? body : new TextDecoder().decode(body)
}

export const storeSecret = async (extensionId: string, key: string, value: string): Promise<void> => {
  Assert.string(extensionId)
  Assert.string(key)
  Assert.string(value)
  if (isElectron()) {
    await MainProcess.invoke('SecretStorage.store', extensionId, key, value)
    return
  }
  const result = await CacheWorker.setCacheStorageItem(getRequestUrl(extensionId, key), value, cacheName)
  if (!result.success) {
    throw new Error(result.errorMessage)
  }
}
