import { activate, registerLanguageServer } from '@lvce-editor/api'

await activate()

registerLanguageServer({
  argv: globalThis.__JAVA_LANGUAGE_SERVER_ARGV__,
  id: 'java',
  languageId: 'java',
  uri: globalThis.__JAVA_LANGUAGE_SERVER_URI__,
})
