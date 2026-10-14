/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'
import * as RendererWorker from '../Rpc/Rpc.ts'

interface WatchOptions {
  readonly exclude?: readonly string[]
  readonly roots: readonly string[]
}

interface Registration {
  readonly application: ExtensionsState.ExtensionsState | undefined
  readonly clientId: number
  disposed: boolean
  readonly extensionId: string
  readonly id: string
}

const registrations = new Map<string, Registration>()
const byId = new Map<string, Registration>()
const keyFor = (extensionId: string, clientId: number, application?: ExtensionsState.ExtensionsState): string =>
  JSON.stringify([application?.applicationGeneration ?? null, extensionId, clientId])

export const create = async (
  extensionId: string,
  clientId: number,
  options: WatchOptions,
  application?: ExtensionsState.ExtensionsState,
): Promise<void> => {
  if (application) ExtensionsState.assertCurrentApplication(application)
  if (
    !Number.isSafeInteger(clientId) ||
    clientId < 1 ||
    !Array.isArray(options?.roots) ||
    options.roots.length === 0 ||
    options.roots.some((uri) => typeof uri !== 'string' || !uri.startsWith('file://')) ||
    (options.exclude !== undefined && (!Array.isArray(options.exclude) || options.exclude.some((name) => typeof name !== 'string')))
  ) {
    throw new Error('File watchers require disk roots and a valid registration id')
  }
  // Application hosts can expose virtual disk paths through browser callbacks;
  // a host-process watch would observe a different filesystem for those URIs.
  if (application) throw new Error('Disk watchers are unavailable for application filesystem providers')
  const key = keyFor(extensionId, clientId, application)
  if (registrations.has(key)) throw new Error('File watcher is already registered')
  const registration = { application, clientId, disposed: false, extensionId, id: crypto.randomUUID() }
  registrations.set(key, registration)
  byId.set(registration.id, registration)
  try {
    await RendererWorker.invoke('FileWatcher.watchExtension', registration.id, { exclude: options.exclude || [], roots: options.roots })
    if (registrations.get(key) !== registration || registration.disposed) throw new Error('File watcher was disposed during registration')
  } catch (error) {
    await dispose(extensionId, clientId, application)
    throw error
  }
}

export const dispose = async (extensionId: string, clientId: number, application?: ExtensionsState.ExtensionsState): Promise<void> => {
  const key = keyFor(extensionId, clientId, application)
  const registration = registrations.get(key)
  if (!registration) return
  registration.disposed = true
  await RendererWorker.invoke('FileWatcher.disposeExtension', registration.id)
  registrations.delete(key)
  byId.delete(registration.id)
}

export const disposeOwner = async (extensionId: string, applicationId?: string): Promise<void> => {
  const owned = registrations
    .values()
    .filter((registration) => registration.extensionId === extensionId && registration.application?.applicationId === applicationId)
    .toArray()
  await Promise.all(owned.map((registration) => dispose(extensionId, registration.clientId, registration.application)))
}

export const handleEvent = async (id: string, event: unknown): Promise<void> => {
  const registration = byId.get(id)
  if (!registration || registration.disposed) return
  const { application, clientId, extensionId } = registration
  if (application) ExtensionsState.assertCurrentApplication(application)
  const rpc = IsolatedExtensionHostWorkerState.get(extensionId, application?.applicationId)
  await rpc?.invoke('ExtensionApi.handleFileWatcherEvent', clientId, event)
}
