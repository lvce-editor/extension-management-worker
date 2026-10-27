/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import { getAllExtensionsWithState } from '../GetAllExtensionsWithState/GetAllExtensionsWithState.ts'

export interface QuickPickCommand {
  readonly args?: readonly unknown[]
  readonly id: string
  readonly label?: string
}

export interface QuickPickCommandResponse {
  readonly commands?: readonly QuickPickCommand[]
  readonly hash: string
  readonly matchesCache: boolean
}

const getHash = async (commands: readonly QuickPickCommand[]): Promise<string> => {
  const bytes = new TextEncoder().encode(JSON.stringify(commands))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export interface ExtensionWithCommands {
  readonly commands?: readonly QuickPickCommand[]
  readonly disabled?: boolean
}

export const createQuickPickCommandResponse = async (
  extensions: readonly ExtensionWithCommands[],
  ifNonMatch?: string | null,
): Promise<readonly QuickPickCommand[] | QuickPickCommandResponse> => {
  const commands = extensions.flatMap((extension) => {
    if (!extension || extension.disabled || !Array.isArray(extension.commands)) {
      return []
    }
    return extension.commands.filter((command: any) => command && command.internal !== true)
  })
  if (ifNonMatch === undefined) {
    return commands
  }
  const hash = await getHash(commands)
  return ifNonMatch === hash ? { hash, matchesCache: true } : { commands, hash, matchesCache: false }
}

export const getQuickPickCommands = async (
  extensionsState: Readonly<ExtensionsState>,
  assetDir: string,
  platform: number,
  ifNonMatch?: string | null,
): Promise<readonly QuickPickCommand[] | QuickPickCommandResponse> => {
  const extensions = await getAllExtensionsWithState(extensionsState, assetDir, platform, ['commands', 'disabled'])
  return createQuickPickCommandResponse(extensions, ifNonMatch)
}
