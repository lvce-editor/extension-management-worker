/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import { PlainMessagePortRpc, type Rpc } from '@lvce-editor/rpc'
import * as ExtensionHostSubWorkerUrl from '../ExtensionHostSubWorkerUrl/ExtensionHostSubWorkerUrl.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import { getContentSecurityPolicy } from '../GetContentSecurityPolicy/GetContentSecurityPolicy.ts'
import { getUrlPrefix } from '../GetUrlPrefix/GetUrlPrefix.ts'
import * as RendererWorker from '../Rpc/Rpc.ts'

interface Services {
  readonly children: Map<string, string | undefined>
  readonly declarations: Map<string, any>
  readonly extensionVersions: Map<string, number>
  nextChild: number
  readonly ports: Map<Rpc, string | undefined>
}

interface PortRpc extends Rpc {
  readonly ipc: { execute: (command: string, ...args: readonly any[]) => Promise<any> }
}

const applications = new Map<number, Services>()
const getServices = (application: ExtensionsState.ExtensionsState): Services => {
  ExtensionsState.assertCurrentApplication(application)
  const generation = application.applicationGeneration!
  let services = applications.get(generation)
  if (!services) {
    services = { children: new Map(), declarations: new Map(), extensionVersions: new Map(), nextChild: 0, ports: new Map() }
    applications.set(generation, services)
  }
  return services
}

export const register = (extension: any, platform: number): void => {
  const application = ExtensionsState.get(extension.applicationId)
  ExtensionsState.assertCurrentApplication(extension)
  const services = getServices(application)
  const prefix = getUrlPrefix(platform, extension.path)
  const declarations = extension.rpc || []
  for (const info of declarations) {
    if (info.type !== 'web-worker') {
      throw new Error('Application extensions only support web-worker RPCs')
    }
    services.declarations.set(info.id, { ...info, extensionId: extension.id, url: `${prefix}/${info.url}` })
  }
}

export const getRpcInfo = (application: ExtensionsState.ExtensionsState, id: string): any => {
  const info = getServices(application).declarations.get(id)
  if (!info) throw new Error(`Rpc not found ${id}`)
  return info
}

export const createWorker = async (
  application: ExtensionsState.ExtensionsState,
  info: any,
  port: MessagePort,
  legacy = false,
  extensionId?: string,
): Promise<void> => {
  const services = getServices(application)
  const id = JSON.stringify([application.applicationId, application.applicationGeneration, 'child', ++services.nextChild])
  services.children.set(id, extensionId)
  const url = legacy ? ExtensionHostSubWorkerUrl.extensionHostSubWorkerUrl : info.url
  try {
    const policy = getContentSecurityPolicy(info.contentSecurityPolicy || [], url)
    await RendererWorker.invokeAndTransfer(
      'LaunchIsolatedExtensionHostWorker.launchIsolatedExtensionHostWorker',
      port,
      id,
      url,
      info.name || '',
      policy,
    )
    ExtensionsState.assertCurrentApplication(application)
    if (!services.children.has(id)) throw new Error('Extension worker was disposed during launch')
  } catch (error) {
    services.children.delete(id)
    await RendererWorker.invoke('LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker', id)
    throw error
  }
}

const fileSystemMethods = new Set(['readFile', 'readDirWithFileTypes', 'stat', 'exists', 'writeFile', 'mkdir', 'remove', 'rename', 'copy', 'getBlob'])

export const createFileSystemPort = async (application: ExtensionsState.ExtensionsState, port: MessagePort, extensionId?: string): Promise<void> => {
  const services = getServices(application)
  const version = extensionId === undefined ? 0 : services.extensionVersions.get(extensionId) || 0
  const rpc = (await PlainMessagePortRpc.create({ commandMap: {}, messagePort: port })) as PortRpc
  // Bind only this connection: registering callbacks globally would let the
  // second IDE replace the first IDE's filesystem routing.
  rpc.ipc.execute = async (command: string, ...args: readonly any[]): Promise<any> => {
    ExtensionsState.assertCurrentApplication(application)
    const method = command.startsWith('FileSystem.') ? command.slice('FileSystem.'.length) : ''
    if (!fileSystemMethods.has(method)) throw new Error(`Unsupported application filesystem command: ${command}`)
    const value = await RendererWorker.invoke('Application.execute', application.applicationId, command, ...args)
    return method === 'stat' ? value.type : value
  }
  try {
    ExtensionsState.assertCurrentApplication(application)
    if (extensionId !== undefined && (services.extensionVersions.get(extensionId) || 0) !== version) {
      throw new Error('Extension was reloaded while opening its filesystem port')
    }
    services.ports.set(rpc, extensionId)
  } catch (error) {
    await rpc.dispose()
    throw error
  }
}

export const dispose = async (application: ExtensionsState.ExtensionsState): Promise<void> => {
  const services = applications.get(application.applicationGeneration!)
  if (!services) return
  applications.delete(application.applicationGeneration!)
  const results = await Promise.allSettled([
    ...Array.from(services.ports.keys(), (rpc) => Promise.try(() => rpc.dispose())),
    ...Array.from(services.children.keys(), (id) =>
      RendererWorker.invoke('LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker', id),
    ),
  ])
  services.ports.clear()
  services.children.clear()
  services.declarations.clear()
  const errors = results.filter((result) => result.status === 'rejected').map((result) => result.reason)
  if (errors.length > 0) throw new AggregateError(errors, 'Failed to dispose application services')
}

export const disposeExtension = async (application: ExtensionsState.ExtensionsState, extensionId: string): Promise<void> => {
  const services = applications.get(application.applicationGeneration!)
  if (!services) return
  services.extensionVersions.set(extensionId, (services.extensionVersions.get(extensionId) || 0) + 1)
  const ports = [...services.ports].filter(([, owner]) => owner === extensionId).map(([rpc]) => rpc)
  const children = [...services.children].filter(([, owner]) => owner === extensionId).map(([id]) => id)
  for (const rpc of ports) services.ports.delete(rpc)
  for (const id of children) services.children.delete(id)
  for (const [id, info] of services.declarations) {
    if (info.extensionId === extensionId) services.declarations.delete(id)
  }
  const results = await Promise.allSettled([
    ...ports.map((rpc) => Promise.try(() => rpc.dispose())),
    ...children.map((id) => RendererWorker.invoke('LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker', id)),
  ])
  const errors = results.filter((result) => result.status === 'rejected').map((result) => result.reason)
  if (errors.length > 0) throw new AggregateError(errors, `Failed to dispose extension services: ${extensionId}`)
}
