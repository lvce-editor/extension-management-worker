import * as Assert from '@lvce-editor/assert'
import { FileSystemWorker, RendererWorker } from '@lvce-editor/rpc-registry'
import * as CacheStorage from '../CacheStorage/CacheStorage.ts'

interface ExtensionEnablementJson {
  readonly disabledExtensions?: readonly unknown[]
  readonly enabledExtensions?: readonly unknown[]
  readonly workspace?: unknown
}

export interface WorkspaceExtensionEnablement {
  readonly disabledIds: readonly string[]
  readonly enabledIds: readonly string[]
  readonly hasWorkspace: boolean
}

interface FileStorageLocation {
  readonly directoryUri: string
  readonly key: string
  readonly type: 'file'
  readonly uri: string
}

interface CacheStorageLocation {
  readonly key: string
  readonly type: 'cache'
}

type StorageLocation = CacheStorageLocation | FileStorageLocation

const WorkspacesFolderName = 'workspaces'
const ExtensionEnablementFileName = 'extension-enablement.json'
const CacheKeyPrefix = '/cache/workspaces'
const UriSchemeRegex = /^[a-zA-Z][a-zA-Z\d+.-]*:/
const WindowsDrivePathRegex = /^[a-zA-Z]:[\\/]/
const WindowsDriveSegmentRegex = /^[a-zA-Z]:$/

const EmptyEnablement: WorkspaceExtensionEnablement = {
  disabledIds: [],
  enabledIds: [],
  hasWorkspace: false,
}

const cache = new Map<string, Promise<WorkspaceExtensionEnablement>>()
const mutationQueues = new Map<string, Promise<void>>()

const encodePathSegment = (segment: string, index: number): string => {
  if (index === 0 && WindowsDriveSegmentRegex.test(segment)) {
    return segment
  }
  return encodeURIComponent(segment)
}

const encodeFilePath = (path: string): string => {
  return path.split('/').map(encodePathSegment).join('/')
}

const toWorkspaceUri = (workspacePath: string): string => {
  if (WindowsDrivePathRegex.test(workspacePath)) {
    return `file:///${encodeFilePath(workspacePath.replaceAll('\\', '/'))}`
  }
  if (UriSchemeRegex.test(workspacePath)) {
    return workspacePath
  }
  if (workspacePath.startsWith('/')) {
    return `file://${encodeFilePath(workspacePath)}`
  }
  return workspacePath
}

const joinUri = (base: string, ...parts: readonly string[]): string => {
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
  return [normalizedBase, ...parts].join('/')
}

const hashWorkspaceUri = async (workspaceUri: string): Promise<string> => {
  const bytes = new TextEncoder().encode(workspaceUri)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
}

const getWorkspaceUri = async (): Promise<string> => {
  let workspacePath: unknown
  try {
    workspacePath = await RendererWorker.invoke('Workspace.getPath')
  } catch {
    return ''
  }
  return typeof workspacePath === 'string' ? toWorkspaceUri(workspacePath) : ''
}

const getConfigUri = async (): Promise<string> => {
  const configUri = await RendererWorker.invoke('WebView.compatSharedProcessInvoke', 'PlatformPaths.getConfigUri')
  if (typeof configUri !== 'string' || configUri === '') {
    throw new Error('Config uri is not available')
  }
  return configUri
}

const getStorageLocation = async (workspaceUri: string): Promise<StorageLocation> => {
  const workspaceHash = await hashWorkspaceUri(workspaceUri)
  try {
    const configUri = await getConfigUri()
    const directoryUri = joinUri(configUri, WorkspacesFolderName, workspaceHash)
    const uri = joinUri(directoryUri, ExtensionEnablementFileName)
    return {
      directoryUri,
      key: uri,
      type: 'file',
      uri,
    }
  } catch {
    return {
      key: joinUri(CacheKeyPrefix, workspaceHash, ExtensionEnablementFileName),
      type: 'cache',
    }
  }
}

const getStringArray = (value: readonly unknown[] | undefined): readonly string[] => {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === 'string')
}

const parseEnablement = (data: ExtensionEnablementJson): WorkspaceExtensionEnablement => {
  return {
    disabledIds: getStringArray(data.disabledExtensions),
    enabledIds: getStringArray(data.enabledExtensions),
    hasWorkspace: true,
  }
}

const readFromLocation = async (location: StorageLocation): Promise<WorkspaceExtensionEnablement> => {
  if (location.type === 'cache') {
    const data = await CacheStorage.getJson(location.key)
    return parseEnablement(data || {})
  }
  const exists = await FileSystemWorker.exists(location.uri)
  if (!exists) {
    return {
      ...EmptyEnablement,
      hasWorkspace: true,
    }
  }
  const content = await FileSystemWorker.readFile(location.uri)
  return parseEnablement(JSON.parse(content))
}

const readFromLocationCached = async (location: StorageLocation): Promise<WorkspaceExtensionEnablement> => {
  const cached = cache.get(location.key)
  if (cached) {
    return cached
  }
  const promise = readFromLocation(location)
  cache.set(location.key, promise)
  try {
    return await promise
  } catch (error) {
    if (cache.get(location.key) === promise) {
      cache.delete(location.key)
    }
    throw error
  }
}

const getWorkspaceAndLocation = async (): Promise<{ readonly location: StorageLocation; readonly workspaceUri: string } | undefined> => {
  const workspaceUri = await getWorkspaceUri()
  if (!workspaceUri) {
    return undefined
  }
  const location = await getStorageLocation(workspaceUri)
  return {
    location,
    workspaceUri,
  }
}

const writeToLocation = async (location: StorageLocation, workspaceUri: string, enablement: WorkspaceExtensionEnablement): Promise<void> => {
  const data = {
    disabledExtensions: enablement.disabledIds,
    enabledExtensions: enablement.enabledIds,
    workspace: workspaceUri,
  }
  if (location.type === 'cache') {
    await CacheStorage.setJson(location.key, data)
  } else {
    const directoryExists = await FileSystemWorker.exists(location.directoryUri)
    if (!directoryExists) {
      await FileSystemWorker.mkdir(location.directoryUri)
    }
    await FileSystemWorker.writeFile(location.uri, JSON.stringify(data, null, 2) + '\n')
  }
  cache.set(location.key, Promise.resolve(enablement))
}

const mutate = async (
  update: (enablement: WorkspaceExtensionEnablement) => WorkspaceExtensionEnablement,
  createIfMissing: boolean,
): Promise<void> => {
  const workspaceAndLocation = await getWorkspaceAndLocation()
  if (!workspaceAndLocation) {
    throw new Error('Cannot change workspace extension enablement without an open workspace')
  }
  const { location, workspaceUri } = workspaceAndLocation
  const previousMutation = mutationQueues.get(location.key) || Promise.resolve()
  const runMutation = async (): Promise<void> => {
    try {
      await previousMutation
    } catch {
      // A failed earlier mutation must not permanently block this workspace.
    }
    if (!createIfMissing && location.type === 'file' && !(await FileSystemWorker.exists(location.uri))) {
      return
    }
    const oldEnablement = await readFromLocation(location)
    const newEnablement = update(oldEnablement)
    await writeToLocation(location, workspaceUri, newEnablement)
  }
  const mutation = runMutation()
  mutationQueues.set(location.key, mutation)
  try {
    await mutation
  } finally {
    if (mutationQueues.get(location.key) === mutation) {
      mutationQueues.delete(location.key)
    }
  }
}

export const clearCache = (): void => {
  cache.clear()
  mutationQueues.clear()
}

export const getWorkspaceExtensionEnablement = async (): Promise<WorkspaceExtensionEnablement> => {
  const workspaceAndLocation = await getWorkspaceAndLocation()
  if (!workspaceAndLocation) {
    return EmptyEnablement
  }
  return readFromLocationCached(workspaceAndLocation.location)
}

export const getWorkspaceExtensionEnablementSafe = async (): Promise<WorkspaceExtensionEnablement> => {
  try {
    return await getWorkspaceExtensionEnablement()
  } catch {
    let workspaceUri = ''
    try {
      workspaceUri = await getWorkspaceUri()
    } catch {
      // Ignore unavailable workspace state while recovering from malformed storage.
    }
    return {
      ...EmptyEnablement,
      hasWorkspace: Boolean(workspaceUri),
    }
  }
}

export const disableExtension = async (id: string): Promise<void> => {
  Assert.string(id)
  await mutate(
    (oldEnablement) => ({
      disabledIds: oldEnablement.disabledIds.includes(id) ? oldEnablement.disabledIds : [...oldEnablement.disabledIds, id],
      enabledIds: oldEnablement.enabledIds.filter((item) => item !== id),
      hasWorkspace: true,
    }),
    true,
  )
}

export const enableExtension = async (id: string): Promise<void> => {
  Assert.string(id)
  await mutate(
    (oldEnablement) => ({
      disabledIds: oldEnablement.disabledIds.filter((item) => item !== id),
      enabledIds: oldEnablement.enabledIds.includes(id) ? oldEnablement.enabledIds : [...oldEnablement.enabledIds, id],
      hasWorkspace: true,
    }),
    true,
  )
}

export const clearExtensionOverride = async (id: string): Promise<void> => {
  Assert.string(id)
  const workspaceAndLocation = await getWorkspaceAndLocation()
  if (!workspaceAndLocation) {
    return
  }
  const { location } = workspaceAndLocation
  if (location.type === 'file' && !(await FileSystemWorker.exists(location.uri))) {
    return
  }
  await mutate(
    (oldEnablement) => ({
      disabledIds: oldEnablement.disabledIds.filter((item) => item !== id),
      enabledIds: oldEnablement.enabledIds.filter((item) => item !== id),
      hasWorkspace: true,
    }),
    false,
  )
}
