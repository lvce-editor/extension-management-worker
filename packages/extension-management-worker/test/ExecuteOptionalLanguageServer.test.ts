import type { Rpc } from '@lvce-editor/rpc'
import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import { executeOptionalLanguageServer } from '../src/parts/ExecuteOptionalLanguageServer/ExecuteOptionalLanguageServer.ts'

const textDocument = { languageId: 'typescript', text: 'const value = 1\nvalue', uri: 'file:///workspace/main.ts' }
const extension = {
  id: 'typescript',
  optionalLanguageServers: [{ connectionId: 'ts7', id: 'ts7.typescript', languageId: 'typescript' }],
}
const invocations: unknown[] = []
const disposables: DisposableMockRpc[] = []
const server = { argv: ['--lsp'], id: 'ts7.typescript', languageId: 'typescript', uri: 'lvce-language-server:typescript' }
const createRpc = (enabled = true): Rpc => ({
  dispose: async () => {},
  invoke: async (method: string) => {
    expect(method).toBe('ExtensionApi.getLanguageServerRegistrySnapshot')
    return { languageServers: enabled ? [server] : [] }
  },
  invokeAndTransfer: async () => {},
  send() {},
})

afterEach(() => {
  invocations.length = 0
  for (const disposable of disposables) {
    disposable[Symbol.dispose]()
  }
  disposables.length = 0
})

test('ordinary providers and inactive optional servers preserve worker dispatch', async () => {
  await expect(executeOptionalLanguageServer(createRpc(), {}, 'completion', '', textDocument, [])).resolves.toEqual({ handled: false })
  await expect(executeOptionalLanguageServer(createRpc(false), extension, 'completion', '', textDocument, [])).resolves.toEqual({ handled: false })
  await expect(executeOptionalLanguageServer(createRpc(), extension, 'completion', '', { languageId: 'css' }, [])).resolves.toEqual({
    handled: false,
  })
})

test.each([
  ['completion', 'LanguageServer.complete', []],
  ['diagnostic', 'LanguageServer.diagnostic', []],
  ['formatting', 'LanguageServer.format', []],
  ['definition', 'LanguageServer.definition', undefined],
  ['document symbol', 'LanguageServer.documentSymbols', []],
  ['reference', 'LanguageServer.references', []],
  ['code action', 'LanguageServer.codeAction', []],
  ['source action', 'LanguageServer.codeAction', []],
] as const)('routes active %s exclusively to the shared server', async (kind, method, expected) => {
  disposables.push(
    RendererWorker.registerMockRpc({
      'Workspace.getPath': () => '/workspace',
    }),
  )
  disposables.push(
    SharedProcess.registerMockRpc({
      [method]: (options: unknown) => {
        invocations.push(options)
        return []
      },
    }),
  )
  await expect(executeOptionalLanguageServer(createRpc(), extension, kind, '', textDocument, [3])).resolves.toEqual({
    handled: true,
    result: expected,
  })
  expect(invocations).toHaveLength(1)
  expect(invocations[0]).toMatchObject({
    id: 'typescript.ts7',
    rootUri: '/workspace',
    uri: server.uri,
  })
})

test('editor conveniences with no LSP equivalent never invoke the worker', async () => {
  await expect(executeOptionalLanguageServer(createRpc(), extension, 'brace completion', '', textDocument, [])).resolves.toEqual({
    handled: true,
    result: undefined,
  })
  await expect(executeOptionalLanguageServer(createRpc(), extension, 'hover', '', { languageId: 'typescript' }, [])).resolves.toEqual({
    handled: true,
    result: undefined,
  })
})

test.each([
  null,
  {},
  { contents: 'hello' },
  { contents: { kind: 'markdown', value: '**hello**' } },
  { contents: [{ language: 'typescript', value: 'const value: 1' }, 'docs', 1] },
])('converts LSP hover contents %j', async (result: unknown) => {
  disposables.push(RendererWorker.registerMockRpc({ 'Workspace.getPath': () => '' }))
  disposables.push(SharedProcess.registerMockRpc({ 'LanguageServer.feature': () => result }))
  const response = await executeOptionalLanguageServer(createRpc(), extension, 'hover', '', textDocument, [3])
  expect(response.handled).toBe(true)
  const textMatcher = { text: expect.any(String) }
  const expected = result && typeof result === 'object' && 'contents' in result ? textMatcher : undefined
  expect(response.result).toEqual(expected)
})

test('converts prepareRename and rename edits, including other documents', async () => {
  const range = { end: { character: 11, line: 0 }, start: { character: 6, line: 0 } }
  disposables.push(
    RendererWorker.registerMockRpc({
      'FileSystem.readFile': () => 'const other = 2',
      'Workspace.getPath': () => '/workspace',
    }),
  )
  let result: unknown = { placeholder: 'value', range }
  disposables.push(SharedProcess.registerMockRpc({ 'LanguageServer.feature': () => result }))
  await expect(executeOptionalLanguageServer(createRpc(), extension, 'rename', 'prepareRename', textDocument, [6])).resolves.toEqual({
    handled: true,
    result: { placeholder: 'value', range: { length: 5, start: 6 } },
  })
  result = range
  await expect(executeOptionalLanguageServer(createRpc(), extension, 'rename', 'prepareRename', textDocument, [6])).resolves.toMatchObject({
    result: { placeholder: 'value' },
  })
  result = null
  await expect(executeOptionalLanguageServer(createRpc(), extension, 'rename', 'prepareRename', textDocument, [6])).resolves.toEqual({
    handled: true,
    result: undefined,
  })
  await expect(executeOptionalLanguageServer(createRpc(), extension, 'rename', 'provideRename', textDocument, [6, 'next'])).resolves.toEqual({
    handled: true,
    result: undefined,
  })
  result = {
    changes: { [textDocument.uri]: [{ newText: 'next', range }] },
    documentChanges: [{ edits: [{ newText: 'next', range }], textDocument: { uri: 'file:///workspace/other.ts' } }],
  }
  await expect(executeOptionalLanguageServer(createRpc(), extension, 'rename', 'provideRename', textDocument, [6, 'next'])).resolves.toEqual({
    handled: true,
    result: {
      canRename: true,
      edits: [
        { edits: [{ deleted: 5, inserted: 'next', offset: 6 }], uri: textDocument.uri },
        { edits: [{ deleted: 5, inserted: 'next', offset: 6 }], uri: 'file:///workspace/other.ts' },
      ],
    },
  })
})

test.each(['implementation', 'type definition', 'signature help'])('routes %s without a competing worker', async (kind) => {
  disposables.push(RendererWorker.registerMockRpc({ 'Workspace.getPath': () => '/workspace' }))
  disposables.push(SharedProcess.registerMockRpc({ 'LanguageServer.feature': () => null }))
  await expect(executeOptionalLanguageServer(createRpc(), extension, kind, '', textDocument, [])).resolves.toMatchObject({ handled: true })
})

test('a missing registry command means inactive, while other activation failures propagate', async () => {
  const rpc = createRpc()
  const missing = {
    ...rpc,
    invoke: async () => {
      throw new Error('command ExtensionApi.getLanguageServerRegistrySnapshot not found')
    },
  }
  await expect(executeOptionalLanguageServer(missing, extension, 'completion', '', textDocument, [])).resolves.toEqual({ handled: false })
  const failed = {
    ...rpc,
    invoke: async () => {
      throw new Error('worker terminated')
    },
  }
  await expect(executeOptionalLanguageServer(failed, extension, 'completion', '', textDocument, [])).rejects.toThrow('worker terminated')
})

test('signature documentation is converted from LSP markup to editor strings', async () => {
  disposables.push(RendererWorker.registerMockRpc({ 'Workspace.getPath': () => '/workspace' }))
  disposables.push(
    SharedProcess.registerMockRpc({
      'LanguageServer.feature': () => ({
        signatures: [
          {
            documentation: { kind: 'plaintext', value: 'Greets a name' },
            label: 'greet(name: string)',
            parameters: [{ documentation: 'Name', label: 'name: string' }],
          },
          { label: 'greet()' },
        ],
      }),
    }),
  )
  await expect(executeOptionalLanguageServer(createRpc(), extension, 'signature help', '', textDocument, [3])).resolves.toEqual({
    handled: true,
    result: {
      activeParameter: 0,
      activeSignature: 0,
      signatures: [
        { documentation: 'Greets a name', label: 'greet(name: string)', parameters: [{ documentation: 'Name', label: 'name: string' }] },
        { documentation: '', label: 'greet()', parameters: [] },
      ],
    },
  })
})

test('waits for optional backend activation before taking the registry snapshot', async () => {
  const ready = Promise.withResolvers<void>()
  const calls: string[] = []
  const rpc: Rpc = {
    ...createRpc(),
    invoke: async (method: string, ...args: readonly unknown[]) => {
      calls.push(method, ...args.map(String))
      if (method === 'ExtensionApi.executeCommand') {
        await ready.promise
        return undefined
      }
      return { languageServers: [] }
    },
  }
  const manifest = {
    ...extension,
    optionalLanguageServers: [{ ...extension.optionalLanguageServers[0], activationCommand: 'typescript.awaitActivation' }],
  }
  const result = executeOptionalLanguageServer(rpc, manifest, 'completion', '', textDocument, [])
  expect(calls).toEqual(['ExtensionApi.executeCommand', 'typescript.awaitActivation'])
  ready.resolve()
  await expect(result).resolves.toEqual({ handled: false })
  expect(calls).toEqual(['ExtensionApi.executeCommand', 'typescript.awaitActivation', 'ExtensionApi.getLanguageServerRegistrySnapshot'])
})
