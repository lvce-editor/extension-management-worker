import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as ExtensionOutputChannel from '../src/parts/ExtensionOutputChannel/ExtensionOutputChannel.ts'
import * as ExtensionsStateModule from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const state: {
  rendererWorker: DisposableMockRpc | undefined
} = {
  rendererWorker: undefined,
}

const createExtensionsState = (webExtensions: readonly any[]): ExtensionsState => {
  return {
    activatedExtensions: Object.create(null),
    cachedActivationEvents: Object.create(null),
    cachedExtensions: undefined,
    disabledIds: [],
    platform: 1,
    runtimeStatuses: Object.create(null),
    webExtensions,
  }
}

const createRpc = (
  commandMap: Readonly<Record<string, (...args: readonly any[]) => any>>,
): { readonly invocations: unknown[]; readonly rpc: Rpc } => {
  const invocations: unknown[] = []
  return {
    invocations,
    rpc: {
      dispose: async () => {},
      invoke: async (method: string, ...params: readonly unknown[]): Promise<any> => {
        invocations.push([method, ...params])
        return commandMap[method](...params)
      },
      invokeAndTransfer: async (): Promise<void> => {},
      send: (): void => {},
    },
  }
}

beforeEach(() => {
  state.rendererWorker = RendererWorker.registerMockRpc({
    'Layout.getAssetDir'() {
      return '/assets'
    },
  })
})

afterEach(() => {
  IsolatedExtensionHostWorkerState.clear()
  state.rendererWorker?.[Symbol.dispose]()
  state.rendererWorker = undefined
})

test('getOutputChannelProviders returns registered contributions from isolated extensions', async () => {
  const extensionsState = createExtensionsState([
    {
      id: 'extension.one',
      isolated: true,
      outputChannels: [
        { id: 'first-output', label: 'First Output', parseLinks: false },
        { id: 'not-created', label: 'Not Created' },
      ],
    },
    {
      id: 'extension.two',
      isolated: true,
      outputChannels: [{ id: 'second-output', label: 'Second Output' }],
    },
    {
      disabled: true,
      id: 'extension.disabled',
      isolated: true,
      outputChannels: [{ id: 'disabled-output', label: 'Disabled Output' }],
    },
    {
      id: 'extension.legacy',
      outputChannels: [{ id: 'legacy-output', label: 'Legacy Output' }],
    },
    {
      id: 'extension.empty',
      isolated: true,
      outputChannels: [],
    },
  ])
  const firstRpc = createRpc({
    'ExtensionApi.getOutputChannelRegistrySnapshot': () => ({ outputChannels: [{ id: 'first-output' }] }),
  })
  const secondRpc = createRpc({
    'ExtensionApi.getOutputChannelRegistrySnapshot': () => ({ outputChannels: [{ id: 'second-output' }] }),
  })
  IsolatedExtensionHostWorkerState.set('extension.one', firstRpc.rpc)
  IsolatedExtensionHostWorkerState.set('extension.two', secondRpc.rpc)

  await expect(ExtensionOutputChannel.getOutputChannelProviders(extensionsState)).resolves.toEqual([
    {
      id: 'first-output',
      label: 'First Output',
      parseLinks: false,
      uri: 'extension-output://extension.one/first-output',
    },
    {
      id: 'second-output',
      label: 'Second Output',
      uri: 'extension-output://extension.two/second-output',
    },
  ])
  expect(firstRpc.invocations).toEqual([['ExtensionApi.getOutputChannelRegistrySnapshot']])
  expect(secondRpc.invocations).toEqual([['ExtensionApi.getOutputChannelRegistrySnapshot']])
})

test('getOutputChannelProviders ignores an invalid registry snapshot', async () => {
  const extensionsState = createExtensionsState([
    {
      id: 'extension.one',
      isolated: true,
      outputChannels: [{ id: 'first-output', label: 'First Output' }],
    },
  ])
  const rpc = createRpc({
    'ExtensionApi.getOutputChannelRegistrySnapshot': () => undefined,
  })
  IsolatedExtensionHostWorkerState.set('extension.one', rpc.rpc)

  await expect(ExtensionOutputChannel.getOutputChannelProviders(extensionsState)).resolves.toEqual([])
})

test('getOutputChannelProviders ignores an extension without snapshot support', async () => {
  const extensionsState = createExtensionsState([
    {
      id: 'extension.legacy',
      isolated: true,
      outputChannels: [{ id: 'legacy-output', label: 'Legacy Output' }],
    },
  ])
  const rpc = createRpc({
    'ExtensionApi.getOutputChannelRegistrySnapshot': () => {
      throw new Error('Command not found ExtensionApi.getOutputChannelRegistrySnapshot')
    },
  })
  IsolatedExtensionHostWorkerState.set('extension.legacy', rpc.rpc)

  await expect(ExtensionOutputChannel.getOutputChannelProviders(extensionsState)).resolves.toEqual([])
})

test('getOutputChannelProviders rethrows extension errors', async () => {
  const extensionsState = createExtensionsState([
    {
      id: 'extension.broken',
      isolated: true,
      outputChannels: [{ id: 'broken-output', label: 'Broken Output' }],
    },
  ])
  const rpc = createRpc({
    'ExtensionApi.getOutputChannelRegistrySnapshot': () => {
      throw new Error('Extension host crashed')
    },
  })
  IsolatedExtensionHostWorkerState.set('extension.broken', rpc.rpc)

  await expect(ExtensionOutputChannel.getOutputChannelProviders(extensionsState)).rejects.toThrow('Extension host crashed')
})

test('getOutputChannelProviders only lists workspace transport channels in the matching workspace', async () => {
  state.rendererWorker?.[Symbol.dispose]()
  state.rendererWorker = RendererWorker.registerMockRpc({
    'Layout.getAssetDir'() {
      return '/assets'
    },
    'Workspace.getUri'() {
      return 'file:///home/user/project'
    },
  })
  const extensionsState = createExtensionsState([
    {
      id: 'builtin.remote-ssh',
      isolated: true,
      outputChannels: [{ id: 'remote-ssh', label: 'Remote SSH' }],
      workspaceTransport: { scheme: 'remote-ssh' },
    },
  ])
  const rpc = createRpc({
    'ExtensionApi.getOutputChannelRegistrySnapshot': () => ({ outputChannels: [{ id: 'remote-ssh' }] }),
  })
  IsolatedExtensionHostWorkerState.set('builtin.remote-ssh', rpc.rpc)

  await expect(ExtensionOutputChannel.getOutputChannelProviders(extensionsState)).resolves.toEqual([])
  expect(rpc.invocations).toEqual([])
})

test('readOutputChannel reads from the matching isolated extension worker', async () => {
  const extensionsState = createExtensionsState([
    {
      id: 'extension.one',
      isolated: true,
      outputChannels: [{ id: 'first-output', label: 'First Output' }],
    },
  ])
  const rpc = createRpc({
    'ExtensionApi.getOutputChannelLogs': () => 'first\nsecond',
  })
  IsolatedExtensionHostWorkerState.set('extension.one', rpc.rpc)

  await expect(ExtensionOutputChannel.readOutputChannel(extensionsState, 'extension-output://extension.one/first-output')).resolves.toBe(
    'first\nsecond',
  )
  expect(rpc.invocations).toEqual([['ExtensionApi.getOutputChannelLogs', 'first-output']])
})

test('readOutputChannel rejects an invalid uri', async () => {
  await expect(ExtensionOutputChannel.readOutputChannel(createExtensionsState([]), 'file:///output.log')).rejects.toThrow(
    'Invalid extension output uri',
  )
})

test('readOutputChannel rejects an unknown contribution', async () => {
  const extensionsState = createExtensionsState([
    {
      id: 'extension.one',
      isolated: true,
      outputChannels: [{ id: 'first-output', label: 'First Output' }],
    },
  ])

  await expect(ExtensionOutputChannel.readOutputChannel(extensionsState, 'extension-output://extension.one/unknown-output')).rejects.toThrow(
    'Output channel unknown-output is not contributed by extension extension.one',
  )
})

test('readOutputChannel rejects an output channel that is not registered', async () => {
  const extensionsState = createExtensionsState([
    {
      id: 'extension.one',
      isolated: true,
      outputChannels: [{ id: 'first-output', label: 'First Output' }],
    },
  ])
  const rpc = createRpc({
    'ExtensionApi.getOutputChannelLogs': () => undefined,
  })
  IsolatedExtensionHostWorkerState.set('extension.one', rpc.rpc)

  await expect(ExtensionOutputChannel.readOutputChannel(extensionsState, 'extension-output://extension.one/first-output')).rejects.toThrow(
    'Output channel first-output is not registered by extension extension.one',
  )
})

test('clearOutputChannel clears the matching isolated extension output channel', async () => {
  const extensionsState = createExtensionsState([
    {
      id: 'extension.one',
      isolated: true,
      outputChannels: [{ id: 'first-output', label: 'First Output' }],
    },
  ])
  const rpc = createRpc({
    'ExtensionApi.clearOutputChannel': () => true,
  })
  IsolatedExtensionHostWorkerState.set('extension.one', rpc.rpc)

  await expect(ExtensionOutputChannel.clearOutputChannel(extensionsState, 'extension-output://extension.one/first-output')).resolves.toBeUndefined()
  expect(rpc.invocations).toEqual([['ExtensionApi.clearOutputChannel', 'first-output']])
})

test('clearOutputChannel rejects an output channel that is not registered', async () => {
  const extensionsState = createExtensionsState([
    {
      id: 'extension.one',
      isolated: true,
      outputChannels: [{ id: 'first-output', label: 'First Output' }],
    },
  ])
  const rpc = createRpc({
    'ExtensionApi.clearOutputChannel': () => false,
  })
  IsolatedExtensionHostWorkerState.set('extension.one', rpc.rpc)

  await expect(ExtensionOutputChannel.clearOutputChannel(extensionsState, 'extension-output://extension.one/first-output')).rejects.toThrow(
    'Output channel first-output is not registered by extension extension.one',
  )
})

test('discovers, reads, and clears channels through the owning application without a global layout', async () => {
  state.rendererWorker?.[Symbol.dispose]()
  state.rendererWorker = RendererWorker.registerMockRpc({
    'Application.execute': async (_applicationId: string, method: string) => {
      if (method === 'Layout.getAssetDir') return '/assets'
      if (method === 'Workspace.getUri') return 'remote-ssh://host/home'
      return 1
    },
  })
  const manifest = {
    id: 'sample.output',
    isolated: true,
    outputChannels: [{ id: 'build', label: 'Build' }],
    workspaceTransport: { scheme: 'remote-ssh' },
  }
  ExtensionsStateModule.createApplication('preview', 1, [manifest])
  const application = ExtensionsStateModule.get('preview')
  const worker = createRpc({
    'ExtensionApi.clearOutputChannel': () => true,
    'ExtensionApi.getOutputChannelLogs': () => 'preview log',
    'ExtensionApi.getOutputChannelRegistrySnapshot': () => ({ outputChannels: [{ id: 'build' }] }),
  })
  IsolatedExtensionHostWorkerState.set('sample.output', worker.rpc, 'preview')
  try {
    const channels = await ExtensionOutputChannel.getOutputChannelProviders(application)
    expect(channels).toEqual([{ id: 'build', label: 'Build', uri: 'extension-output://sample.output/build' }])
    await expect(ExtensionOutputChannel.readOutputChannel(application, channels[0].uri)).resolves.toBe('preview log')
    await ExtensionOutputChannel.clearOutputChannel(application, channels[0].uri)
    expect(state.rendererWorker.invocations).toEqual([
      ['Application.execute', 'preview', 'Layout.getAssetDir'],
      ['Application.execute', 'preview', 'Workspace.getUri'],
      ['Application.execute', 'preview', 'Layout.getAssetDir'],
      ['Application.execute', 'preview', 'Layout.getAssetDir'],
    ])
  } finally {
    ExtensionsStateModule.removeApplication('preview')
    IsolatedExtensionHostWorkerState.clear('preview')
  }
})
