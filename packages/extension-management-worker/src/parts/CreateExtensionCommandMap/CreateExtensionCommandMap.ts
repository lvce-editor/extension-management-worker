import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'
import { getNodeRpcInfo } from '../GetNodeRpcPath/GetNodeRpcPath.ts'

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
    'Extensions.getNodeRpcInfo'(rpcId: string) {
      return getNodeRpcInfo(extensionId, rpcId)
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
