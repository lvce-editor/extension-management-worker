import type { Rpc } from '@lvce-editor/rpc'
import { expect, test } from '@jest/globals'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import { executeLanguageServerDiagnostic } from '../src/parts/ExecuteLanguageServerDiagnostic/ExecuteLanguageServerDiagnostic.ts'

const extension = {
  id: 'test.markdown-language-server',
  languageServers: [
    {
      id: 'vscode-markdown',
      languageId: 'markdown',
    },
  ],
  uri: 'file:///test/extension',
}

const textDocument = {
  languageId: 'markdown',
  text: '[missing][reference]',
  uri: 'file:///workspace/README.md',
}

const createRpc = (): Rpc => {
  return {
    dispose: async () => {},
    invoke: async () => ({
      languageServers: [
        {
          argv: ['--stdio'],
          id: 'vscode-markdown',
          languageId: 'markdown',
          uri: 'dist/language-server.js',
        },
      ],
    }),
    invokeAndTransfer: async () => {},
    send: () => {},
  }
}

test('executeLanguageServerDiagnostic invokes the shared process and sanitizes diagnostics', async () => {
  const invocations: unknown[] = []
  const sharedProcess = SharedProcess.registerMockRpc({
    'LanguageServer.diagnostic'(options: unknown) {
      invocations.push(options)
      return [
        {
          message: "No link definition found: 'reference'",
          range: {
            end: { character: 20, line: 0 },
            start: { character: 10, line: 0 },
          },
          severity: 2,
          source: 'markdown',
        },
        {
          message: 'error',
          range: {
            end: { character: 1, line: 2 },
            start: { character: 0, line: 2 },
          },
          severity: 1,
        },
        null,
      ]
    },
  })

  await expect(executeLanguageServerDiagnostic(createRpc(), extension, textDocument)).resolves.toEqual([
    {
      columnIndex: 10,
      endColumnIndex: 20,
      endRowIndex: 0,
      message: "No link definition found: 'reference'",
      rowIndex: 0,
      source: 'markdown',
      type: 'warning',
    },
    {
      columnIndex: 0,
      endColumnIndex: 1,
      endRowIndex: 2,
      message: 'error',
      rowIndex: 2,
      type: 'error',
    },
  ])
  expect(invocations).toEqual([
    {
      argv: ['--stdio'],
      id: 'test.markdown-language-server.vscode-markdown',
      textDocument,
      uri: 'file:///test/extension/dist/language-server.js',
    },
  ])
  sharedProcess[Symbol.dispose]()
})

test('executeLanguageServerDiagnostic ignores incomplete documents and unmatched contributions', async () => {
  const rpc = createRpc()

  await expect(executeLanguageServerDiagnostic(rpc, extension, { languageId: 'markdown', uri: 'file:///README.md' })).resolves.toEqual([])
  await expect(executeLanguageServerDiagnostic(rpc, extension, { languageId: 'markdown', text: '' })).resolves.toEqual([])
  await expect(executeLanguageServerDiagnostic(rpc, extension, { languageId: 'plaintext', text: '', uri: 'file:///README.txt' })).resolves.toEqual([])
})
