import { CacheWorker } from '@lvce-editor/rpc-registry'
import { VError } from '@lvce-editor/verror'
import * as CreateResponseFromData from '../CreateResponseFromData/CreateResponseFromData.ts'

const cacheName = 'Extensions' // TODO

export const getJson = async (cacheKey: string): Promise<any> => {
  const item = await CacheWorker.getCacheStorageItem(cacheKey, cacheName)
  if (!item) {
    return undefined
  }
  const body = item.body as string | ArrayBuffer
  const json = typeof body === 'string' ? body : new TextDecoder().decode(body)
  return JSON.parse(json)
}

export const setJson = async (cacheKey: string, data: any): Promise<void> => {
  try {
    const response = CreateResponseFromData.createResponseFromData(data)
    const headers = Object.fromEntries(response.headers.entries())
    const result = await CacheWorker.setCacheStorageItem(cacheKey, await response.arrayBuffer(), cacheName, headers)
    if (!result.success) {
      throw new Error(result.errorMessage)
    }
  } catch (error) {
    throw new VError(error, `Failed to add to cache`)
  }
}
