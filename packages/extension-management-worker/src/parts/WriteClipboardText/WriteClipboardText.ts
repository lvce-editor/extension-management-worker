/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import * as ExtensionsStateModule from '../ExtensionsState/ExtensionsState.ts'
import { getAllExtensionsWithState } from '../GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'

export const writeClipboardText = async (
  extensionId: string,
  text: unknown,
  invoke: (method: string, ...args: readonly any[]) => any,
  application?: ExtensionsState,
  isDisposed: () => boolean = () => false,
): Promise<unknown> => {
  const assertCurrent = (): void => {
    if (isDisposed()) throw new Error('Extension runtime is disposed')
    if (application) ExtensionsStateModule.assertCurrentApplication(application)
  }
  assertCurrent()
  if (typeof text !== 'string') {
    throw new TypeError('Clipboard text must be a string')
  }
  const state = ExtensionsStateModule.get(application?.applicationId)
  const { assetDir, platform } = await getRuntimeContext('', state.platform, state.applicationId)
  assertCurrent()
  const extensions = await getAllExtensionsWithState(state, assetDir, platform, ['id', 'permissions', 'disabled', 'browser', 'isolated'])
  assertCurrent()
  const extension = extensions.find((item) => item.id === extensionId)
  if (
    !extension ||
    extension.disabled ||
    extension.isolated !== true ||
    typeof extension.browser !== 'string' ||
    !Array.isArray(extension.permissions) ||
    extension.permissions.some((permission: unknown) => typeof permission !== 'string') ||
    !extension.permissions.includes('clipboard.write')
  ) {
    throw new Error(`Extension ${extensionId} requires the clipboard.write permission`)
  }
  return invoke('Extensions.executeCommand', 'ClipBoard.writeText', text)
}
