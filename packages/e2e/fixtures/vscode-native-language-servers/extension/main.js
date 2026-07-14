import { activate, registerLanguageServer } from '@lvce-editor/api'

await activate()

registerLanguageServer({
  argv: ['--stdio'],
  id: 'vscode-html',
  languageId: 'html-native',
  uri: import.meta.resolve('vscode-langservers-extracted/bin/vscode-html-language-server'),
})

registerLanguageServer({
  argv: ['--stdio'],
  id: 'vscode-css',
  languageId: 'css-native',
  uri: import.meta.resolve('vscode-langservers-extracted/bin/vscode-css-language-server'),
})

registerLanguageServer({
  argv: ['--stdio'],
  id: 'vscode-json',
  languageId: 'json-native',
  uri: import.meta.resolve('vscode-langservers-extracted/bin/vscode-json-language-server'),
})
