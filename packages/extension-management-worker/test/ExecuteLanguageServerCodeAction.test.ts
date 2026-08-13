import type { Rpc } from '@lvce-editor/rpc'
import { expect, test } from '@jest/globals'
import { RendererWorker, SharedProcess } from '@lvce-editor/rpc-registry'
import { executeLanguageServerCodeAction } from '../src/parts/ExecuteLanguageServerCodeAction/ExecuteLanguageServerCodeAction.ts'

const extension = {
  id: 'builtin.language-features-elm',
  languageServers: [{ id: 'elm-language-server', languageId: 'elm' }],
  uri: 'file:///extension',
}

const createRpc = (): Rpc => {
  return {
    dispose: async () => {},
    invoke: async () => ({
      languageServers: [
        {
          argv: [],
          id: 'elm-language-server',
          languageId: 'elm',
          uri: 'dist/elm-language-server.mjs',
        },
      ],
    }),
    invokeAndTransfer: async () => {},
    send() {},
  }
}

test('executeLanguageServerCodeAction ignores incomplete documents and unmatched contributions', async () => {
  const rpc = createRpc()

  await expect(executeLanguageServerCodeAction(rpc, extension, { languageId: 'elm', uri: '/workspace/Main.elm' }, 0)).resolves.toEqual([])
  await expect(executeLanguageServerCodeAction(rpc, extension, { languageId: 'elm', text: '' }, 0)).resolves.toEqual([])
  await expect(
    executeLanguageServerCodeAction(rpc, { ...extension, languageServers: [] }, { languageId: 'elm', text: '', uri: '/workspace/Main.elm' }, 0),
  ).resolves.toEqual([])
})

test('executeLanguageServerCodeAction sanitizes same-document edits', async () => {
  const textDocument = {
    languageId: 'elm',
    text: 'a\r\nbc',
    uri: '/workspace/Main.elm',
  }
  const sharedProcess = SharedProcess.registerMockRpc({
    'LanguageServer.codeAction'() {
      return [
        null,
        {},
        { title: 'Command without edits' },
        {
          edit: {
            changes: {
              'file:///workspace/Other.elm': [],
            },
          },
          title: 'Edit another document',
        },
        {
          edit: {
            changes: {
              'file:///workspace/Main.elm': [
                {
                  newText: 'invalid line',
                  range: {
                    end: { character: 0, line: 4 },
                    start: { character: 0, line: 4 },
                  },
                },
                {
                  range: {
                    end: { character: 1, line: 0 },
                    start: { character: 0, line: 0 },
                  },
                },
                {
                  newText: 'reversed',
                  range: {
                    end: { character: 0, line: 0 },
                    start: { character: 1, line: 1 },
                  },
                },
              ],
            },
          },
          title: 'Invalid edits',
        },
        {
          edit: {
            changes: {
              'file:///workspace/Main.elm': [
                {
                  newText: 'updated',
                  range: {
                    end: { character: 99, line: 1 },
                    start: { character: 0, line: 1 },
                  },
                },
              ],
            },
          },
          title: 'Update second line',
        },
        {
          edit: {
            documentChanges: [
              {
                edits: [
                  {
                    newText: '\nmissing() ->\n  todo',
                    range: {
                      end: { character: 2, line: 1 },
                      start: { character: 2, line: 1 },
                    },
                  },
                ],
                textDocument: {
                  uri: 'file:///workspace/Main.elm',
                  version: 1,
                },
              },
              {
                edits: [],
                textDocument: {
                  uri: 'file:///workspace/Other.elm',
                  version: 1,
                },
              },
            ],
          },
          title: 'Create function `missing/0`',
        },
      ]
    },
  })
  const rendererWorker = RendererWorker.registerMockRpc({
    'Workspace.getPath'() {
      return undefined
    },
  })

  try {
    await expect(executeLanguageServerCodeAction(createRpc(), extension, textDocument, 3)).resolves.toEqual([
      {
        edits: [
          {
            endOffset: 5,
            inserted: 'updated',
            startOffset: 3,
          },
        ],
        name: 'Update second line',
      },
      {
        edits: [
          {
            endOffset: 5,
            inserted: '\nmissing() ->\n  todo',
            startOffset: 5,
          },
        ],
        name: 'Create function `missing/0`',
      },
    ])
  } finally {
    rendererWorker[Symbol.dispose]()
    sharedProcess[Symbol.dispose]()
  }
})
