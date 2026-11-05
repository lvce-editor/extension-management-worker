/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { writeClipboardText } from '../src/parts/WriteClipboardText/WriteClipboardText.ts'

const getExtensions = jest.fn<(...args: readonly unknown[]) => Promise<readonly any[]>>()
const mocks: { renderer: DisposableMockRpc | undefined; shared: DisposableMockRpc | undefined } = { renderer: undefined, shared: undefined }
const manifest = { browser: 'main.js', id: 'chat', isolated: true, permissions: ['clipboard.write'] }

beforeEach(() => {
  ExtensionsState.setPlatform(4)
  mocks.renderer = RendererWorker.registerMockRpc({
    'Application.execute': () => '/assets',
    'Layout.getAssetDir': () => '/assets',
  })
  mocks.shared = SharedProcess.registerMockRpc({ 'ExtensionManagement.getAllExtensions': getExtensions })
})

afterEach(() => {
  mocks.renderer?.[Symbol.dispose]()
  mocks.shared?.[Symbol.dispose]()
  getExtensions.mockReset()
  ExtensionsState.removeApplication('app')
  ExtensionsState.reset()
})

test('writes text for an isolated extension with clipboard.write permission', async () => {
  getExtensions.mockResolvedValue([manifest])
  const invoke = jest.fn(async (..._args: readonly unknown[]) => 'written')
  await expect(writeClipboardText('chat', 'message text', invoke)).resolves.toBe('written')
  expect(invoke).toHaveBeenCalledWith('Extensions.executeCommand', 'ClipBoard.writeText', 'message text')
})

test.each([undefined, [], 'clipboard.write', [true], ['clipboard.write', null], ['clipboard.read']])(
  'rejects missing or malformed clipboard permissions %j',
  async (permissions) => {
    getExtensions.mockResolvedValue([{ ...manifest, permissions }])
    const invoke = jest.fn()
    await expect(writeClipboardText('chat', 'message text', invoke)).rejects.toThrow('requires the clipboard.write permission')
    expect(invoke).not.toHaveBeenCalled()
  },
)

test.each([{ disabled: true }, { isolated: false }, { browser: undefined }])('rejects unavailable callers %j', async (override) => {
  getExtensions.mockResolvedValue([{ ...manifest, ...override }])
  await expect(writeClipboardText('chat', 'message text', jest.fn())).rejects.toThrow('requires the clipboard.write permission')
})

test('rejects non-string clipboard values before looking up permissions', async () => {
  await expect(writeClipboardText('chat', 42, jest.fn())).rejects.toThrow('Clipboard text must be a string')
  expect(getExtensions).not.toHaveBeenCalled()
})

test('does not write after the runtime is disposed during permission lookup', async () => {
  getExtensions.mockResolvedValue([manifest])
  let disposed = false
  const invoke = jest.fn()
  const result = writeClipboardText('chat', 'message text', invoke, undefined, () => disposed)
  disposed = true
  await expect(result).rejects.toThrow('Extension runtime is disposed')
  expect(invoke).not.toHaveBeenCalled()
})
