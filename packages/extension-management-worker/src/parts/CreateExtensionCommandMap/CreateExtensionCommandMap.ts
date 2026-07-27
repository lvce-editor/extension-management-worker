import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'
import { getNodeRpcInfo } from '../GetNodeRpcPath/GetNodeRpcPath.ts'
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

export const createExtensionCommandMap = (extensionId: string): ExtensionCommandMap => {
  return {
    ...CommandMapRef.commandMapRef,
    'Extensions.deleteSecret'(key: string) {
      return deleteSecret(extensionId, key)
    },
    'Extensions.getNodeRpcInfo'(rpcId: string) {
      return getNodeRpcInfo(extensionId, rpcId)
    },
    'Extensions.getSecret'(key: string) {
      return getSecret(extensionId, key)
    },
    'Extensions.storeSecret'(key: string, value: string) {
      return storeSecret(extensionId, key, value)
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
