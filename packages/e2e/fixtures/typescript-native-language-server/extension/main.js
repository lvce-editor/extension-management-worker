import { activate, registerLanguageServer } from '@lvce-editor/api'

await activate()

registerLanguageServer({
  argv: ['--lsp', '--stdio'],
  id: 'typescript-native',
  languageId: 'typescript-native',
  uri: '../../../node_modules/typescript/bin/tsc',
})
