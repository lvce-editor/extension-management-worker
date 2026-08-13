import { activate, registerLanguageServer } from '@lvce-editor/api'

await activate()

registerLanguageServer({
  argv: [],
  id: 'zls',
  languageId: 'zig',
  uri: globalThis.__ZIG_LANGUAGE_SERVER_URI__,
})
