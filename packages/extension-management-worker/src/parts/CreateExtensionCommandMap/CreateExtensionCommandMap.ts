import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'
import { createNodeRpcConnection, createNodeRpcMessagePort } from '../CreateNodeRpcConnection/CreateNodeRpcConnection.ts'
import * as FileChangeHandlerRegistry from '../FileChangeHandlerRegistry/FileChangeHandlerRegistry.ts'
import { handleUncaughtExtensionError } from '../HandleUncaughtExtensionError/HandleUncaughtExtensionError.ts'
import * as LegacyNodeRpc from '../LegacyNodeRpc/LegacyNodeRpc.ts'
import { deleteSecret, getSecret, storeSecret } from '../SecretStorage/SecretStorage.ts'

export type ExtensionCommand = (...args: readonly any[]) => any
export type ExtensionCommandMap = Readonly<Record<string, ExtensionCommand>>

class CommandNotFoundError extends Error {
  constructor(command: string) {
    super(`Command not found ${command}`)
    Object.defineProperty(this, 'name', {
      value: 'CommandNotFoundError',
    })
  }
}

const allowedElectronPortCommand = 'HandleMessagePortForEmbedsProcess.handleMessagePortForEmbedsProcess'
const workspaceSetUriCommand = 'Workspace.setUri'
const privilegedCommandPrefixes = [
  'ElectronNet.',
  'ClipBoard.',
  'DebugSharedProcess.',
  'Developer.',
  'Electron',
  'Exec.',
  'ExtensionNodeRpc.',
  'FileSystem',
  'FileWatcher.',
  'IpcParent.',
  'PlatformPaths.',
  'PersistentFileHandle.',
  'Process.',
  'RebuildNodePty.',
  'SearchProcess.',
  'SendMessagePort',
  'SharedProcess.',
  'TerminalProcess.',
  'Transferrable.',
  'WebSocketCapability.',
  'WebView.compat',
]

const invokeGlobalCommand = (method: string, ...params: readonly any[]): any => {
  const command = (CommandMapRef.commandMapRef as Record<string, ExtensionCommand>)[method]
  if (!command) {
    throw new CommandNotFoundError(method)
  }
  return command(...params)
}

const executeDeferredCommand = async (id: string, args: readonly any[]): Promise<void> => {
  try {
    await invokeGlobalCommand('Extensions.executeCommand', id, ...args)
  } catch (error) {
    await handleUncaughtExtensionError(error)
  }
}

const executeCommand = (id: string, ...args: readonly any[]): any => {
  if (privilegedCommandPrefixes.some((prefix) => id.startsWith(prefix))) {
    throw new Error(`Isolated extensions cannot execute privileged command ${id}`)
  }
  if (id === workspaceSetUriCommand) {
    setTimeout(() => {
      void executeDeferredCommand(id, args).catch(() => {})
    }, 0)
    return undefined
  }
  return invokeGlobalCommand('Extensions.executeCommand', id, ...args)
}

export const createExtensionCommandMap = (extensionId: string): ExtensionCommandMap => {
  return {
    ...CommandMapRef.commandMapRef,
    'Extensions.createLegacyNodeRpc'(rpcId: string) {
      return LegacyNodeRpc.create(extensionId, rpcId)
    },
    'Extensions.createNodeRpcConnection'(rpcId: string) {
      return createNodeRpcConnection(extensionId, rpcId)
    },
    'Extensions.createNodeRpcMessagePort'(rpcId: string, port: MessagePort) {
      return createNodeRpcMessagePort(extensionId, rpcId, port)
    },
    'Extensions.deleteSecret'(key: string) {
      return deleteSecret(extensionId, key)
    },
    'Extensions.disposeLegacyNodeRpc'(id: number) {
      return LegacyNodeRpc.dispose(extensionId, id)
    },
    'Extensions.executeCommand': executeCommand,
    'Extensions.getSecret'(key: string) {
      return getSecret(extensionId, key)
    },
    'Extensions.invokeLegacyNodeRpc'(id: number, method: string, ...params: readonly any[]) {
      return LegacyNodeRpc.invoke(extensionId, id, method, ...params)
    },
    'Extensions.registerFileChangeHandler'() {
      FileChangeHandlerRegistry.register(extensionId)
    },
    'Extensions.sendMessagePortToElectron'(port: MessagePort, initialCommand: string) {
      if (initialCommand !== allowedElectronPortCommand) {
        throw new Error(`Isolated extensions cannot send a port using ${initialCommand}`)
      }
      return invokeGlobalCommand('Extensions.sendMessagePortToElectron', port, initialCommand)
    },
    'Extensions.storeSecret'(key: string, value: string) {
      return storeSecret(extensionId, key, value)
    },
    'Extensions.unregisterFileChangeHandler'() {
      FileChangeHandlerRegistry.unregister(extensionId)
    },
  }
}

export const createExtensionCommandExecutor = (commandMap: ExtensionCommandMap): ExtensionCommand => {
  return (method: string, ...params: readonly any[]): any => {
    const command = commandMap[method]
    if (!command) {
      throw new CommandNotFoundError(method)
    }
    return command(...params)
  }
}
