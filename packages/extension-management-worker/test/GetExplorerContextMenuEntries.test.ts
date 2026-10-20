/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { getExplorerContextMenuEntries } from '../src/parts/GetExplorerContextMenuEntries/GetExplorerContextMenuEntries.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const mocks: { renderer: DisposableMockRpc | undefined } = { renderer: undefined }
const extension = { activation: ['onExplorerContextMenu'], commands: [{ id: 'runner.run' }], id: 'runner', isolated: true }
const context = { isDirectory: false, uri: 'file:///workspace/a%20b.js' }

beforeEach(() => {
  mocks.renderer = RendererWorker.registerMockRpc({ 'Layout.getAssetDir': () => '/assets' })
})

afterEach(() => {
  mocks.renderer?.[Symbol.dispose]()
  IsolatedExtensionHostWorkerState.clear()
  ExtensionsState.reset()
})

const register = (entries: readonly unknown[]): readonly unknown[][] => {
  const calls: unknown[][] = []
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...args: readonly unknown[]) => {
      calls.push([method, ...args])
      return entries
    },
    invokeAndTransfer: async () => {},
    send() {},
  }
  IsolatedExtensionHostWorkerState.set('runner', rpc)
  return calls
}

test('routes declared extension commands with the captured clicked resource', async () => {
  const calls = register([{ args: ['wrong-resource'], command: 'runner.run', id: 'run', label: 'Run' }])
  ExtensionsState.update({ platform: 1, webExtensions: [extension] })
  const entries = await getExplorerContextMenuEntries(ExtensionsState.get(), context)
  expect(calls).toEqual([['ExtensionApi.getExplorerContextMenuEntries', context]])
  expect(entries).toEqual([
    { args: ['runner.run', context.uri], command: 'Extensions.executeCommand', flags: 0, id: '["runner","run"]', label: 'Run' },
  ])
})

test.each([{ disabled: true }, { activation: [] }, { isolated: false }])('does not query unavailable providers %j', async (override) => {
  const calls = register([{ command: 'runner.run', id: 'run', label: 'Run' }])
  ExtensionsState.update({ platform: 1, webExtensions: [{ ...extension, ...override }] })
  expect(await getExplorerContextMenuEntries(ExtensionsState.get(), context)).toEqual([])
  expect(calls).toEqual([])
})

test('filters undeclared commands and malformed contributions', async () => {
  register([null, {}, { command: 'Layout.runInTerminal', id: 'unsafe', label: 'Run' }, { command: 'runner.run', id: '', label: 'Run' }])
  ExtensionsState.update({ platform: 1, webExtensions: [extension] })
  expect(await getExplorerContextMenuEntries(ExtensionsState.get(), context)).toEqual([])
})

test('a failed provider does not break the built-in menu', async () => {
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async () => {
      throw new Error('provider failed')
    },
    invokeAndTransfer: async () => {},
    send() {},
  }
  IsolatedExtensionHostWorkerState.set('runner', rpc)
  ExtensionsState.update({ platform: 1, webExtensions: [extension] })
  expect(await getExplorerContextMenuEntries(ExtensionsState.get(), context)).toEqual([])
})
