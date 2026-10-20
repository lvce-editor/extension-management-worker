/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import * as ExtensionsStateModule from '../ExtensionsState/ExtensionsState.ts'
import { getAllExtensionsWithState } from '../GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import { getRpc } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'

interface ExplorerContext {
  readonly isDirectory: boolean
  readonly uri: string
}

interface MenuEntry {
  readonly args: readonly string[]
  readonly command: string
  readonly flags: number
  readonly id: string
  readonly label: string
}

const event = 'onExplorerContextMenu'

export const getExplorerContextMenuEntries = async (state: ExtensionsState, context: ExplorerContext): Promise<readonly MenuEntry[]> => {
  if (!context || typeof context.uri !== 'string' || typeof context.isDirectory !== 'boolean') {
    throw new Error('Explorer context requires a uri and isDirectory flag')
  }
  const clicked = { isDirectory: context.isDirectory, uri: context.uri }
  ExtensionsStateModule.assertCurrentApplication(state)
  const { assetDir, platform } = await getRuntimeContext('', state.platform, state.applicationId)
  const extensions = await getAllExtensionsWithState(state, assetDir, platform)
  ExtensionsStateModule.assertCurrentApplication(state)
  const matching = extensions.filter(
    (extension) =>
      !extension.disabled &&
      IsExtensionIsolated.isExtensionIsolated(extension) &&
      Array.isArray(extension.activation) &&
      extension.activation.includes(event),
  )
  const results = await Promise.all(
    matching.map(async (extension): Promise<readonly MenuEntry[]> => {
      try {
        const rpc = await getRpc(extension, assetDir, platform, event)
        const entries = await rpc.invoke('ExtensionApi.getExplorerContextMenuEntries', clicked)
        ExtensionsStateModule.assertCurrentApplication(state)
        if (!Array.isArray(entries)) return []
        const declaredCommands = new Set(Array.isArray(extension.commands) ? extension.commands.map((command: any) => command.id) : [])
        return entries
          .filter(
            (entry) =>
              entry &&
              typeof entry.id === 'string' &&
              entry.id &&
              typeof entry.label === 'string' &&
              entry.label &&
              typeof entry.command === 'string' &&
              declaredCommands.has(entry.command),
          )
          .map((entry) => ({
            args: [entry.command, clicked.uri],
            command: 'Extensions.executeCommand',
            flags: 0,
            id: JSON.stringify([extension.id, entry.id]),
            label: entry.label,
          }))
      } catch {
        // A failed extension must not prevent the built-in Explorer menu from opening.
        return []
      }
    }),
  )
  ExtensionsStateModule.assertCurrentApplication(state)
  return results.flat()
}
