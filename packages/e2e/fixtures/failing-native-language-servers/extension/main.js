import { activate, registerLanguageServer } from '@lvce-editor/api'

await activate()

const languageServers = [
  ['exit-zero', 'language-server-exit-zero'],
  ['exit-one', 'language-server-exit-one'],
  ['uncaught-exception', 'language-server-uncaught-exception'],
  ['crash-on-completion', 'language-server-crash-on-completion'],
  ['reject-completion', 'language-server-reject-completion'],
  ['healthy', 'language-server-healthy'],
]

for (const [id, languageId] of languageServers) {
  registerLanguageServer({
    argv: [],
    id,
    languageId,
    uri: `./servers/${id}.js`,
  })
}
