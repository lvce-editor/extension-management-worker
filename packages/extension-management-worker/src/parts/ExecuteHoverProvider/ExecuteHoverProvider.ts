/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { Rpc } from '@lvce-editor/rpc'
import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import { contributesOptionalLanguageServer, executeOptionalLanguageServer } from '../ExecuteOptionalLanguageServer/ExecuteOptionalLanguageServer.ts'
import { getAllExtensionsWithState } from '../GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import { getRpc } from '../GetIsolatedExtensionHostWorkerRpc/GetIsolatedExtensionHostWorkerRpc.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'

interface HoverProviderContribution {
  readonly languageId?: string
}

interface ExtensionManifest {
  readonly browser?: string
  readonly builtin?: boolean
  readonly disabled?: boolean
  readonly hoverProviders?: readonly HoverProviderContribution[]
  readonly id?: string
  readonly isWeb?: boolean
  readonly optionalLanguageServers?: readonly { readonly connectionId?: string; readonly id?: string; readonly languageId?: string }[]
  readonly path?: string
  readonly uri?: string
}

interface TextDocument {
  readonly languageId: string
}

const contributesHoverProvider = (extension: ExtensionManifest, languageId: string): boolean => {
  return Array.isArray(extension.hoverProviders) && extension.hoverProviders.some((provider) => provider.languageId === languageId)
}

const getMatchingExtensions = async (
  extensionsState: ExtensionsState,
  textDocument: TextDocument,
  assetDir: string,
  platform: number,
): Promise<readonly ExtensionManifest[]> => {
  const extensions = await getAllExtensionsWithState(extensionsState, assetDir, platform)
  return extensions.filter(
    (extension): boolean =>
      !extension.disabled &&
      IsExtensionIsolated.isExtensionIsolated(extension) &&
      (contributesHoverProvider(extension, textDocument.languageId) || contributesOptionalLanguageServer(extension, textDocument.languageId)),
  )
}

const executeRpcHoverProvider = async (rpc: Rpc, textDocument: TextDocument, args: readonly unknown[]): Promise<unknown> => {
  return rpc.invoke('ExtensionApi.executeHoverProvider', textDocument, ...args)
}

export const executeHoverProvider = async (
  extensionsState: ExtensionsState,
  textDocument: TextDocument,
  ...args: readonly unknown[]
): Promise<unknown> => {
  const { assetDir, platform } = await getRuntimeContext('', extensionsState.platform)
  const extensions = await getMatchingExtensions(extensionsState, textDocument, assetDir, platform)
  const rpcs = await Promise.all(extensions.map((extension) => getRpc(extension, assetDir, platform)))
  const results = await Promise.all(
    rpcs.map(async (rpc, index) => {
      const optional = await executeOptionalLanguageServer(rpc, extensions[index], 'hover', '', textDocument, args)
      if (optional.handled) {
        return optional.result
      }
      if (contributesHoverProvider(extensions[index], textDocument.languageId)) {
        return executeRpcHoverProvider(rpc, textDocument, args)
      }
      return undefined
    }),
  )
  return results[0]
}
