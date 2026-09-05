import type { Rpc } from '@lvce-editor/rpc'

const rpcs = Object.create(null)
const applicationRpcs = new Map<string, Map<string, Rpc>>()

export const get = (extensionId: string, applicationId?: string): Rpc | undefined => {
  if (applicationId !== undefined) {
    return applicationRpcs.get(applicationId)?.get(extensionId)
  }
  return rpcs[extensionId]
}

export const getAll = (applicationId?: string): readonly Rpc[] => {
  if (applicationId !== undefined) {
    return [...(applicationRpcs.get(applicationId)?.values() || [])]
  }
  return Object.values(rpcs)
}

export const getIds = (applicationId?: string): readonly string[] => {
  if (applicationId !== undefined) {
    return [...(applicationRpcs.get(applicationId)?.keys() || [])]
  }
  return Object.keys(rpcs)
}

export const set = (extensionId: string, rpc: Rpc, applicationId?: string): void => {
  if (applicationId !== undefined) {
    const entries = applicationRpcs.get(applicationId) || new Map<string, Rpc>()
    entries.set(extensionId, rpc)
    applicationRpcs.set(applicationId, entries)
    return
  }
  rpcs[extensionId] = rpc
}

export const remove = (extensionId: string, applicationId?: string): Rpc | undefined => {
  if (applicationId !== undefined) {
    const entries = applicationRpcs.get(applicationId)
    const rpc = entries?.get(extensionId)
    entries?.delete(extensionId)
    if (entries?.size === 0) {
      applicationRpcs.delete(applicationId)
    }
    return rpc
  }
  const rpc = rpcs[extensionId]
  delete rpcs[extensionId]
  return rpc
}

export const clear = (applicationId?: string): void => {
  if (applicationId !== undefined) {
    applicationRpcs.delete(applicationId)
    return
  }
  for (const key of Object.keys(rpcs)) {
    delete rpcs[key]
  }
}
