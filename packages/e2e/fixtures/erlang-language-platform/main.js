import { activate, registerFormattingProvider, registerLanguageServer } from '@lvce-editor/api'
import { ExtensionManagementWorker } from '@lvce-editor/rpc-registry'

await activate()

registerFormattingProvider({
  id: 'erlang-language-platform-diagnostic-driver',
  languageId: 'erlang-language-platform-diagnostic-driver',
  async format(textDocument) {
    const diagnostics = await ExtensionManagementWorker.invoke('Extensions.executeDiagnosticProvider', {
      ...textDocument,
      languageId: 'erlang',
    })
    return [
      {
        endOffset: 0,
        inserted: JSON.stringify(diagnostics),
        startOffset: 0,
      },
    ]
  },
})

registerLanguageServer({
  argv: ['server'],
  id: 'erlang-language-platform',
  languageId: 'erlang',
  uri: globalThis.__ERLANG_LANGUAGE_PLATFORM_URI__,
})
