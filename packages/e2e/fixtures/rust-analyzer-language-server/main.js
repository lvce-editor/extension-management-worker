import { activate, registerLanguageServer } from '@lvce-editor/api'

await activate()

registerLanguageServer({
  argv: [],
  id: 'rust-analyzer',
  languageId: 'rust',
  uri: globalThis.__RUST_ANALYZER_URI__,
})
