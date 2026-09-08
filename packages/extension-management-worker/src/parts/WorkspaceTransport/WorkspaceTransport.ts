import { RendererWorker } from '@lvce-editor/rpc-registry'
import type { ExtensionManifest } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import { getAllExtensionsWithState } from '../GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import { getRpc } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'

interface TransportExtension extends ExtensionManifest {
  readonly disabled?: boolean
  readonly isolated?: boolean
  readonly workspaceTransport?: {
    readonly command: string
    readonly scheme: string
    readonly requestCommand?: string
  }
}

const getWorkspaceUri = async (): Promise<string> => {
  const uri = await RendererWorker.invoke('Workspace.getUri')
  return typeof uri === 'string' ? uri : ''
}

const isRemoteUri = (uri: string): boolean => /^[a-z][a-z0-9+.-]*:\/\//i.test(uri) && !uri.startsWith('file://')

export const getRemoteWorkspaceUri = async (): Promise<string> => {
  const uri = await getWorkspaceUri()
  return isRemoteUri(uri) ? uri : ''
}

const findTransport = async (workspaceUri: string) => {
  const extensionsState = ExtensionsState.get()
  const { assetDir, platform } = await getRuntimeContext('', extensionsState.platform)
  const extensions: readonly TransportExtension[] = await getAllExtensionsWithState(extensionsState, assetDir, platform)
  const scheme = new URL(workspaceUri).protocol.slice(0, -1)
  const extension = extensions.find(
    (candidate) => !candidate.disabled && candidate.isolated === true && candidate.workspaceTransport?.scheme === scheme,
  )
  return { assetDir, extension, platform }
}

export const getWorkspaceTransportUri = async (): Promise<string> => {
  const uri = await getRemoteWorkspaceUri()
  if (!uri) {
    return ''
  }
  const { extension } = await findTransport(uri)
  return extension?.workspaceTransport?.command ? uri : ''
}

const getTransport = async (workspaceUri: string) => {
  const { assetDir, extension, platform } = await findTransport(workspaceUri)
  if (!extension?.workspaceTransport?.command) {
    throw new Error(`No workspace transport for ${new URL(workspaceUri).protocol}`)
  }
  const rpc = await getRpc(extension, assetDir, platform)
  return { command: extension.workspaceTransport.command, rpc }
}

export const connect = async (
  workspaceUri: string,
  type: string,
  port: MessagePort,
  params: Readonly<Record<string, string>> = {},
): Promise<void> => {
  try {
    if (!isRemoteUri(workspaceUri)) {
      throw new Error('A remote workspace is required')
    }
    const { command, rpc } = await getTransport(workspaceUri)
    if (workspaceUri !== (await getWorkspaceUri())) {
      throw new Error('Workspace changed while connecting the remote process')
    }
    await rpc.invokeAndTransfer('ExtensionApi.executeCommand', command, workspaceUri, type, port, params)
  } catch (error) {
    port.close()
    throw error
  }
}

export const connectTerminal = async (workspaceUri: string, port: MessagePort): Promise<void> => {
  await connect(workspaceUri, 'terminal-process', port)
}

export const request = async (workspaceUri: string, type: string, ...args: readonly unknown[]): Promise<unknown> => {
  if (!isRemoteUri(workspaceUri) || !['text-search', 'file-search', 'terminal-options'].includes(type)) {
    throw new Error('Unsupported workspace request')
  }
  const { assetDir, extension, platform } = await findTransport(workspaceUri)
  const command = extension?.workspaceTransport?.requestCommand
  if (!extension || !command) {
    throw new Error('Workspace transport does not support requests')
  }
  const rpc = await getRpc(extension, assetDir, platform)
  return rpc.invoke('ExtensionApi.executeCommand', command, workspaceUri, type, ...args)
}
