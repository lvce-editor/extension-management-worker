import { activate, registerLanguageServer } from '@lvce-editor/api'

await activate()

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
