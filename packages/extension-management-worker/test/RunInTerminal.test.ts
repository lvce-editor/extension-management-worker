/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { runInTerminal } from '../src/parts/RunInTerminal/RunInTerminal.ts'

const getExtensions = jest.fn<(...args: readonly unknown[]) => Promise<readonly any[]>>()
const mocks: { renderer: DisposableMockRpc | undefined; shared: DisposableMockRpc | undefined } = { renderer: undefined, shared: undefined }
beforeEach(() => {
  ExtensionsState.setPlatform(4)
  mocks.renderer = RendererWorker.registerMockRpc({
    'Application.execute': () => '/assets',
    'Layout.getAssetDir': () => '/assets',
  })
  mocks.shared = SharedProcess.registerMockRpc({ 'ExtensionManagement.getAllExtensions': getExtensions })
})
const execution = { args: ['/workspace/file ; $(touch nope).js'], command: 'node', cwd: '/workspace' }
const manifest = { browser: 'main.js', id: 'runner', isolated: true, permissions: ['terminal.execute'] }

afterEach(() => {
  mocks.renderer?.[Symbol.dispose]()
  mocks.shared?.[Symbol.dispose]()
  getExtensions.mockReset()
  ExtensionsState.removeApplication('app')
  ExtensionsState.reset()
})

test('uses the trusted caller identity and preserves argument boundaries', async () => {
  getExtensions.mockResolvedValue([manifest])
  const invoke = jest.fn(async (..._args: readonly unknown[]) => 42)
  await expect(runInTerminal('runner', execution, invoke)).resolves.toBe(42)
  expect(invoke).toHaveBeenCalledWith('Extensions.executeCommand', 'Layout.runInTerminal', execution)
  await expect(runInTerminal('other', execution, invoke)).rejects.toThrow('other requires the terminal.execute permission')
  expect(invoke).toHaveBeenCalledTimes(1)
})

test.each([undefined, [], 'terminal.execute', [true], ['terminal.execute', null], ['terminal.write']])(
  'rejects missing or malformed permissions %j',
  async (permissions) => {
    getExtensions.mockResolvedValue([{ ...manifest, permissions }])
    const invoke = jest.fn()
    await expect(runInTerminal('runner', execution, invoke)).rejects.toThrow('requires the terminal.execute permission')
    expect(invoke).not.toHaveBeenCalled()
  },
)

test.each([{ disabled: true }, { isolated: false }, { browser: undefined }])('rejects unavailable callers %j', async (override) => {
  getExtensions.mockResolvedValue([{ ...manifest, ...override }])
  await expect(runInTerminal('runner', execution, jest.fn())).rejects.toThrow('requires the terminal.execute permission')
})

test.each([
  undefined,
  {},
  { ...execution, args: 'file.js' },
  { ...execution, args: [1] },
  { ...execution, command: '' },
  { ...execution, cwd: '' },
  { ...execution, args: ['bad\0.js'] },
])('rejects invalid process options %j', async (options) => {
  await expect(runInTerminal('runner', options, jest.fn())).rejects.toThrow('Terminal execution requires')
  expect(getExtensions).not.toHaveBeenCalled()
})

test('copies options before permission lookup yields', async () => {
  getExtensions.mockResolvedValue([manifest])
  const options = { args: ['safe.js'], command: 'node', cwd: '/workspace' }
  const invoke = jest.fn(async (..._args: readonly unknown[]) => {})
  const result = runInTerminal('runner', options, invoke)
  options.args[0] = 'changed.js'
  options.command = 'changed'
  await result
  expect(invoke).toHaveBeenCalledWith('Extensions.executeCommand', 'Layout.runInTerminal', { args: ['safe.js'], command: 'node', cwd: '/workspace' })
})

test('does not execute after the runtime is disposed during permission lookup', async () => {
  getExtensions.mockResolvedValue([manifest])
  let disposed = false
  const invoke = jest.fn()
  const result = runInTerminal('runner', execution, invoke, undefined, () => disposed)
  disposed = true
  await expect(result).rejects.toThrow('Extension runtime is disposed')
  expect(invoke).not.toHaveBeenCalled()
})

test('does not execute for a replacement application with the same id', async () => {
  ExtensionsState.createApplication('app', 4, [])
  const application = ExtensionsState.get('app')
  getExtensions.mockResolvedValue([manifest])
  const invoke = jest.fn()
  const result = runInTerminal('runner', execution, invoke, application)
  ExtensionsState.removeApplication('app')
  ExtensionsState.createApplication('app', 4, [])
  await expect(result).rejects.toThrow('Stale extension application')
  expect(invoke).not.toHaveBeenCalled()
})
