import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'
import { createNodeRpcConnection, createNodeRpcMessagePort } from '../CreateNodeRpcConnection/CreateNodeRpcConnection.ts'
import * as FileChangeHandlerRegistry from '../FileChangeHandlerRegistry/FileChangeHandlerRegistry.ts'
import { handleUncaughtExtensionError } from '../HandleUncaughtExtensionError/HandleUncaughtExtensionError.ts'
import { createNotification } from '../Notifications/Notifications.ts'
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

const executeDeferredCommand = async (invokeCommand: ExtensionCommand, id: string, args: readonly any[]): Promise<void> => {
  try {
    await invokeCommand('Extensions.executeCommand', id, ...args)
  } catch (error) {
    await handleUncaughtExtensionError(error)
  }
}

const executeCommand = (invokeCommand: ExtensionCommand, id: string, ...args: readonly any[]): any => {
  if (privilegedCommandPrefixes.some((prefix) => id.startsWith(prefix))) {
    throw new Error(`Isolated extensions cannot execute privileged command ${id}`)
  }
  if (id === workspaceSetUriCommand) {
    setTimeout(() => {
      void executeDeferredCommand(invokeCommand, id, args).catch(() => {})
    }, 0)
    return undefined
  }
  return invokeCommand('Extensions.executeCommand', id, ...args)
}

export const createExtensionCommandMap = (extensionId: string, invokeCommand: ExtensionCommand = invokeGlobalCommand): ExtensionCommandMap => {
  const inheritedCommands =
    invokeCommand === invokeGlobalCommand
      ? CommandMapRef.commandMapRef
      : Object.fromEntries(
          Object.keys(CommandMapRef.commandMapRef).map((method) => [method, (...args: readonly any[]) => invokeCommand(method, ...args)]),
        )
  if (invokeCommand !== invokeGlobalCommand) {
    // Application runtimes must not bypass the scoped router through a legacy
    // callback (notifications, secrets, file watchers, or privileged node ports).
    return {
      ...inheritedCommands,
      'Extensions.executeCommand': (id: string, ...args: readonly any[]) => executeCommand(invokeCommand, id, ...args),
      'Extensions.registerFileChangeHandler': () => invokeCommand('Extensions.registerFileChangeHandler'),
      'Extensions.unregisterFileChangeHandler': () => invokeCommand('Extensions.unregisterFileChangeHandler'),
    }
  }
  return {
    ...inheritedCommands,
    'Extensions.createNodeRpcConnection'(rpcId: string) {
      return createNodeRpcConnection(extensionId, rpcId)
    },
    'Extensions.createNodeRpcMessagePort'(rpcId: string, port: MessagePort) {
      return createNodeRpcMessagePort(extensionId, rpcId, port)
    },
    'Extensions.deleteSecret'(key: string) {
      return deleteSecret(extensionId, key)
    },
    'Extensions.executeCommand'(id: string, ...args: readonly any[]) {
      return executeCommand(invokeCommand, id, ...args)
    },
    'Extensions.getSecret'(key: string) {
      return getSecret(extensionId, key)
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
    'Extensions.showNotification'(type: string, message: string) {
      return createNotification(extensionId, type, message)
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
