import { activate, registerFormattingProvider, registerLanguageServer, registerReferenceProvider } from '@lvce-editor/api'
import { ExtensionManagementWorker } from '@lvce-editor/rpc-registry'

await activate()

registerReferenceProvider({
  id: 'reference-e2e',
  languageId: 'reference-e2e',
  provideReferences(textDocument, offset, position) {
    return [
      {
        endColumnIndex: position.columnIndex + 4,
        endRowIndex: position.rowIndex,
        offset,
        startColumnIndex: position.columnIndex,
        startRowIndex: position.rowIndex,
        uri: textDocument.uri,
      },
    ]
  },
})

registerFormattingProvider({
  id: 'reference-e2e-driver',
  languageId: 'reference-e2e-driver',
  async format() {
    const activationResult = await ExtensionManagementWorker.invoke('Extensions.activateByEvent', 'onReferences:reference-e2e', '', 2)
    const textDocument = {
      languageId: 'reference-e2e',
      text: 'const value = 1',
      uri: 'file:///workspace/reference.reference-e2e',
    }
    const position = {
      columnIndex: 6,
      rowIndex: 0,
    }
    const providerResult = await ExtensionManagementWorker.invoke(
      'Extensions.executeLanguageProvider',
      'reference',
      'provideReferences',
      textDocument,
      6,
      position,
    )
    return [
      {
        endOffset: 0,
        inserted: JSON.stringify({
          activationResult,
          providerResult,
        }),
        startOffset: 0,
      },
    ]
  },
})

const failingLanguageServers = [
  ['exit-zero', 'language-server-exit-zero'],
  ['exit-one', 'language-server-exit-one'],
  ['uncaught-exception', 'language-server-uncaught-exception'],
  ['crash-on-completion', 'language-server-crash-on-completion'],
  ['reject-completion', 'language-server-reject-completion'],
  ['healthy', 'language-server-healthy'],
]

for (const [id, languageId] of failingLanguageServers) {
  registerLanguageServer({
    argv: [],
    id,
    languageId,
    uri: `./servers/${id}.js`,
  })
}

const vscodeLanguageServers = [
  ['vscode-html', 'html-native', globalThis.__VSCODE_HTML_LANGUAGE_SERVER_URI__],
  ['vscode-css', 'css-native', globalThis.__VSCODE_CSS_LANGUAGE_SERVER_URI__],
]

for (const [id, languageId, uri] of vscodeLanguageServers) {
  registerLanguageServer({
    argv: ['--stdio'],
    id,
    languageId,
    uri,
  })
}

registerLanguageServer({
  argv: [],
  id: 'vscode-json',
  languageId: 'json-native',
  uri: './servers/json-completion.js',
})

registerLanguageServer({
  argv: ['--lsp', '--stdio'],
  id: 'typescript-native',
  languageId: 'typescript-native',
  uri: globalThis.__TYPESCRIPT_LANGUAGE_SERVER_URI__,
})
