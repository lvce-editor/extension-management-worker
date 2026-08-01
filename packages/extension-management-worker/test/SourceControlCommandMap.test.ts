import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { commandMap } from '../src/parts/CommandMap/CommandMap.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const state: { rendererWorker: DisposableMockRpc | undefined } = {
  rendererWorker: undefined,
}

const invocations: unknown[] = []

beforeEach(() => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'Layout.getAssetDir'() {
      return '/assets'
    },
  })
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...params: readonly unknown[]) => {
      invocations.push([method, ...params])
      return method === 'ExtensionApi.executeSourceControlIsActive' || method
    },
    invokeAndTransfer: async () => {},
    send() {},
  }
  IsolatedExtensionHostWorkerState.set('git-extension', rpc)
  ExtensionsState.setPlatform(1)
  ExtensionsState.setWebExtensions([
    {
      id: 'git-extension',
      isolated: true,
      sourceControlProviders: [{ id: 'git' }],
    },
  ])
})

afterEach(() => {
  invocations.length = 0
  ExtensionsState.reset()
  IsolatedExtensionHostWorkerState.clear()
  state.rendererWorker?.[Symbol.dispose]()
  state.rendererWorker = undefined
})

test('exposes the legacy source control provider discovery command', async () => {
  await expect(commandMap['ExtensionHostSourceControl.getEnabledProviderIds']('file', '/workspace')).resolves.toEqual(['git'])
  expect(invocations).toEqual([['ExtensionApi.executeSourceControlIsActive', 'git', 'file', '/workspace']])
})

test.each([
  ['ExtensionHost.sourceControlGetChangedFiles', 'executeSourceControlGetChangedFiles', []],
  ['ExtensionHostSourceControl.acceptInput', 'executeSourceControlAcceptInput', ['message']],
  ['ExtensionHostSourceControl.add', 'executeSourceControlAdd', ['/workspace/file.txt']],
  ['ExtensionHostSourceControl.discard', 'executeSourceControlDiscard', ['/workspace/file.txt']],
  ['ExtensionHostSourceControl.generateCommitMessage', 'executeSourceControlGenerateCommitMessage', []],
  ['ExtensionHostSourceControl.getBadgeCount', 'executeSourceControlGetBadgeCount', []],
  ['ExtensionHostSourceControl.getChangedFiles', 'executeSourceControlGetChangedFiles', []],
  ['ExtensionHostSourceControl.getFeatures', 'executeSourceControlGetFeatures', []],
  ['ExtensionHostSourceControl.getFileBefore', 'executeSourceControlGetFileBefore', ['/workspace/file.txt']],
  ['ExtensionHostSourceControl.getFileDecorations', 'executeSourceControlGetFileDecorations', [['/workspace/file.txt']]],
  ['ExtensionHostSourceControl.getGroups', 'executeSourceControlGetGroups', ['/workspace']],
])('routes %s to the isolated source control provider', async (command, methodName, args) => {
  await expect(commandMap[command]('git', ...args)).resolves.toBe(`ExtensionApi.${methodName}`)
  expect(invocations).toEqual([[`ExtensionApi.${methodName}`, 'git', ...args]])
})

test('throws when the requested provider is not registered', async () => {
  await expect(commandMap['ExtensionHostSourceControl.getGroups']('missing', '/workspace')).rejects.toThrow('No source control provider found')
})

test('keeps missing source control icon definitions optional', async () => {
  await expect(commandMap['ExtensionHostSourceControl.getIconDefinitions']('git')).resolves.toEqual([])
})
