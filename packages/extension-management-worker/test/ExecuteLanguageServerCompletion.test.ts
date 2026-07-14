import type { Rpc } from '@lvce-editor/rpc'
import { expect, test } from '@jest/globals'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import {
  executeLanguageServerCompletion,
  resolveLanguageServerUri,
} from '../src/parts/ExecuteLanguageServerCompletion/ExecuteLanguageServerCompletion.ts'

test('resolveLanguageServerUri resolves relative executable URIs from an extension path', () => {
  expect(
    resolveLanguageServerUri(
      {
        uri: 'file:///test/packages/e2e/fixtures/typescript-native',
      },
      '../../node_modules/typescript/bin/tsc',
    ),
  ).toBe('file:///test/packages/e2e/node_modules/typescript/bin/tsc')
  expect(resolveLanguageServerUri({ path: '/test/extension' }, 'server')).toBe('file:///test/extension/server')
  expect(resolveLanguageServerUri({ uri: 'file:///test/extension/' }, 'server')).toBe('file:///test/extension/server')
  expect(resolveLanguageServerUri({ uri: 'file:///test/extension' }, '/usr/bin/server')).toBe('file:///usr/bin/server')
  expect(resolveLanguageServerUri({ uri: 'file:///test/extension' }, 'file:///usr/bin/server')).toBe('file:///usr/bin/server')
  expect(() => resolveLanguageServerUri({ uri: 'relative-extension' }, 'server')).toThrow(
    'Language server extension path must be an absolute path or URI',
  )
})

test('executeLanguageServerCompletion invokes the shared-process proxy and sanitizes completion items', async () => {
  const invocations: unknown[] = []
  const sharedProcess = SharedProcess.registerMockRpc({
    'LanguageServer.complete'(options: unknown) {
      invocations.push(options)
      return [
        {
          insertText: 'console',
          kind: 6,
          label: 'console',
        },
        {
          label: 'textEditCompletion',
          textEdit: {
            newText: 'replacement',
          },
        },
        {
          label: 'labelCompletion',
        },
        null,
      ]
    },
  })
  const rpc = {
    dispose: async () => {},
    invoke: async () => ({
      languageServers: [
        {
          argv: ['--lsp', '--stdio'],
          id: 'typescript-native',
          languageId: 'typescript',
          uri: '../../node_modules/typescript/bin/tsc',
        },
      ],
    }),
    invokeAndTransfer: async () => {},
    send: () => {},
  } as Rpc
  const extension = {
    id: 'test.typescript-native',
    languageServers: [
      {
        id: 'typescript-native',
        languageId: 'typescript',
      },
    ],
    uri: 'file:///test/packages/e2e/fixtures/typescript-native',
  }
  const textDocument = {
    languageId: 'typescript',
    text: 'con',
    uri: 'file:///workspace/test.ts',
  }

  await expect(executeLanguageServerCompletion(rpc, extension, textDocument, 3)).resolves.toEqual([
    {
      flags: 0,
      insertText: 'console',
      kind: 6,
      label: 'console',
      matches: [],
      snippet: 'console',
    },
    {
      flags: 0,
      kind: 0,
      label: 'textEditCompletion',
      matches: [],
      snippet: 'replacement',
      textEdit: {
        newText: 'replacement',
      },
    },
    {
      flags: 0,
      kind: 0,
      label: 'labelCompletion',
      matches: [],
      snippet: 'labelCompletion',
    },
  ])
  expect(invocations).toEqual([
    {
      argv: ['--lsp', '--stdio'],
      id: 'test.typescript-native.typescript-native',
      offset: 3,
      textDocument,
      uri: 'file:///test/packages/e2e/node_modules/typescript/bin/tsc',
    },
  ])
  sharedProcess[Symbol.dispose]()
})

test('executeLanguageServerCompletion rejects missing registrations', async () => {
  const rpc = {
    dispose: async () => {},
    invoke: async () => ({ languageServers: [] }),
    invokeAndTransfer: async () => {},
    send: () => {},
  } as Rpc
  const extension = {
    id: 'test.typescript-native',
    languageServers: [{ languageId: 'typescript' }],
    uri: 'file:///test/extension',
  }
  const textDocument = {
    languageId: 'typescript',
    text: 'con',
    uri: 'file:///workspace/test.ts',
  }

  await expect(executeLanguageServerCompletion(rpc, extension, textDocument, 3)).rejects.toThrow(
    'language server <unknown> is contributed in extension.json but not registered',
  )
})

test('executeLanguageServerCompletion ignores incomplete documents and unmatched contributions', async () => {
  const rpc = {
    dispose: async () => {},
    invoke: async () => {
      throw new Error('unexpected invocation')
    },
    invokeAndTransfer: async () => {},
    send: () => {},
  } as Rpc
  const extension = {
    languageServers: [{ id: 'sample', languageId: 'typescript' }],
    uri: 'file:///test/extension',
  }

  await expect(executeLanguageServerCompletion(rpc, extension, { languageId: 'typescript', uri: 'file:///test.ts' }, 0)).resolves.toEqual([])
  await expect(executeLanguageServerCompletion(rpc, extension, { languageId: 'typescript', text: '' }, 0)).resolves.toEqual([])
  await expect(executeLanguageServerCompletion(rpc, extension, { languageId: 'javascript', text: '', uri: 'file:///test.js' }, 0)).resolves.toEqual(
    [],
  )
})
