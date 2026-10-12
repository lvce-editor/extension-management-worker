import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, beforeEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import type { ExtensionsState } from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as ExecuteCompletionProvider from '../src/parts/ExecuteCompletionProvider/ExecuteCompletionProvider.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const state: {
  rendererWorker: DisposableMockRpc | undefined
} = {
  rendererWorker: undefined,
}

const createRpc = (
  result: readonly unknown[],
): {
  readonly invocations: readonly unknown[]
  readonly rpc: Rpc
} => {
  const invocations: unknown[] = []
  const rpc: Rpc = {
    dispose: async () => {},
    invoke: async (method: string, ...params: readonly unknown[]): Promise<readonly unknown[]> => {
      invocations.push([method, ...params])
      return result
    },
    invokeAndTransfer: async (): Promise<void> => {},
    send: (): void => {},
  }
  return {
    invocations,
    rpc,
  }
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

test('executeCompletionProvider asks matching isolated completion providers and returns the first result', async () => {
  const textDocument = {
    languageId: 'javascript',
    text: 'const value=1',
    uri: 'file:///test.js',
  }
  const extensionsState = createExtensionsState([
    {
      completionProviders: [
        {
          id: 'completion.javascript.one',
          languageId: 'javascript',
        },
      ],
      id: 'extension-one',
      isolated: true,
    },
    {
      completionProviders: [
        {
          id: 'completion.javascript.two',
          languageId: 'javascript',
        },
      ],
      id: 'extension-two',
      isolated: true,
    },
    {
      completionProviders: [
        {
          id: 'completion.css',
          languageId: 'css',
        },
      ],
      id: 'extension-css',
      isolated: true,
    },
  ])
  const firstResult = [
    {
      label: 'first',
      type: 1,
    },
  ]
  const secondResult = [
    {
      label: 'second',
      type: 1,
    },
  ]
  const firstRpc = createRpc(firstResult)
  const secondRpc = createRpc(secondResult)
  IsolatedExtensionHostWorkerState.set('extension-one', firstRpc.rpc)
  IsolatedExtensionHostWorkerState.set('extension-two', secondRpc.rpc)

  await expect(ExecuteCompletionProvider.executeCompletionProvider(extensionsState, textDocument, 4)).resolves.toEqual(firstResult)
  await expect(ExecuteCompletionProvider.executeCompletionProvider(extensionsState, textDocument, 4)).resolves.toEqual(firstResult)

  expect(firstRpc.invocations).toEqual([
    ['ExtensionApi.executeCompletionProvider', textDocument, 4],
    ['ExtensionApi.executeCompletionProvider', textDocument, 4],
  ])
  expect(secondRpc.invocations).toEqual([
    ['ExtensionApi.executeCompletionProvider', textDocument, 4],
    ['ExtensionApi.executeCompletionProvider', textDocument, 4],
  ])
})

test('executeCompletionProvider returns empty completions when no matching isolated completion provider exists', async () => {
  const extensionsState = createExtensionsState([
    {
      completionProviders: [
        {
          id: 'completion.css',
          languageId: 'css',
        },
      ],
      id: 'extension-css',
      isolated: true,
    },
  ])

  await expect(
    ExecuteCompletionProvider.executeCompletionProvider(extensionsState, {
      languageId: 'javascript',
    }),
  ).resolves.toEqual([])
})

test('executeCompletionProvider ignores disabled completion provider contributions', async () => {
  const textDocument = {
    languageId: 'typescript',
  }
  const extensionsState = createExtensionsState([
    {
      completionProviders: [
        {
          id: 'completion.typescript',
          languageId: 'typescript',
        },
      ],
      disabled: true,
      id: 'extension-typescript',
      isolated: true,
    },
  ])
  const rpc = createRpc([{ label: 'ignored' }])
  IsolatedExtensionHostWorkerState.set('extension-typescript', rpc.rpc)

  await expect(ExecuteCompletionProvider.executeCompletionProvider(extensionsState, textDocument)).resolves.toEqual([])

  expect(rpc.invocations).toEqual([])
})

test('executeCompletionProvider routes language server contributions through the shared process', async () => {
  const textDocument = {
    languageId: 'typescript',
    text: 'con',
    uri: 'file:///test.ts',
  }
  const extensionsState = createExtensionsState([
    {
      id: 'extension-language-server',
      isolated: true,
      languageServers: [{ id: 'typescript-native', languageId: 'typescript' }],
      uri: 'file:///test/extension',
    },
  ])
  const invocations: unknown[] = []
  const sharedProcess = SharedProcess.registerMockRpc({
    'LanguageServer.complete'(options: unknown) {
      invocations.push(options)
      return [{ kind: 6, label: 'console' }]
    },
  })
  const extensionRpc = createRpc({
    languageServers: [
      {
        argv: ['--lsp', '--stdio'],
        id: 'typescript-native',
        languageId: 'typescript',
        uri: 'server',
      },
    ],
  } as never)
  IsolatedExtensionHostWorkerState.set('extension-language-server', extensionRpc.rpc)

  await expect(ExecuteCompletionProvider.executeCompletionProvider(extensionsState, textDocument, 3)).resolves.toEqual([
    {
      flags: 0,
      kind: 6,
      label: 'console',
      matches: [],
      snippet: 'console',
    },
  ])
  expect(invocations).toHaveLength(1)
  sharedProcess[Symbol.dispose]()
})

test('projected desktop manifests still select and execute completion providers', async () => {
  const manifest = {
    browser: 'main.js',
    completionProviders: [{ languageId: 'typescript' }],
    contentSecurityPolicy: ['worker-src self'],
    description: 'Unrelated metadata',
    id: 'projected-provider',
    isolated: true,
    rpc: [{ id: 'provider-rpc', type: 'worker', url: 'rpc.js' }],
    workerName: 'Provider',
  }
  let requestedFields: readonly string[] | undefined
  using sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions': async (fields: readonly string[]) => {
      requestedFields = fields
      return [
        Object.fromEntries(
          fields.filter((field) => Object.hasOwn(manifest, field)).map((field) => [field, manifest[field as keyof typeof manifest]]),
        ),
      ]
    },
  })
  const providerRpc = createRpc([{ label: 'result' }])
  IsolatedExtensionHostWorkerState.set(manifest.id, providerRpc.rpc)
  const extensionsState = { ...createExtensionsState([]), platform: PlatformType.Test }
  const document = { languageId: 'typescript' }
  expect(await ExecuteCompletionProvider.executeCompletionProvider(extensionsState, document)).toEqual([{ label: 'result' }])
  expect(providerRpc.invocations).toEqual([['ExtensionApi.executeCompletionProvider', document]])
  expect(requestedFields).toEqual(expect.arrayContaining(['browser', 'completionProviders', 'contentSecurityPolicy', 'rpc', 'workerName']))
  expect(requestedFields).not.toContain('description')
  expect(sharedProcess.invocations).toHaveLength(1)
})
