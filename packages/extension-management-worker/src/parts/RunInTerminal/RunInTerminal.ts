/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import * as ExtensionsStateModule from '../ExtensionsState/ExtensionsState.ts'
import { getAllExtensionsWithState } from '../GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'

interface TerminalExecution {
  readonly args: readonly string[]
  readonly command: string
  readonly cwd: string
}

const isString = (value: unknown): value is string => typeof value === 'string' && !value.includes('\0')

const validate = (value: unknown): TerminalExecution => {
  const options = value as Partial<TerminalExecution> | undefined
  if (
    !options ||
    !isString(options.command) ||
    !options.command ||
    !isString(options.cwd) ||
    !options.cwd ||
    !Array.isArray(options.args) ||
    !options.args.every(isString)
  ) {
    throw new Error('Terminal execution requires a command, working directory and string arguments without null bytes')
  }
  return { args: [...options.args], command: options.command, cwd: options.cwd }
}

export const runInTerminal = async (
  extensionId: string,
  options: unknown,
  invoke: (method: string, ...args: readonly any[]) => any,
  application?: ExtensionsState,
  isDisposed: () => boolean = () => false,
): Promise<unknown> => {
  const assertCurrent = (): void => {
    if (isDisposed()) throw new Error('Extension runtime is disposed')
    if (application) ExtensionsStateModule.assertCurrentApplication(application)
  }
  assertCurrent()
  // Copy caller-owned arguments before the asynchronous permission lookup.
  const execution = validate(options)
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
    !extension.permissions.includes('terminal.execute')
  ) {
    throw new Error(`Extension ${extensionId} requires the terminal.execute permission`)
  }
  return invoke('Extensions.executeCommand', 'Layout.runInTerminal', execution)
}
