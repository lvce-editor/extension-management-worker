import { activate, registerFormattingProvider, registerLanguageServer } from '@lvce-editor/api'
import { ExtensionManagementWorker } from '@lvce-editor/rpc-registry'

await activate()

registerFormattingProvider({
  id: 'elm-native-diagnostic-driver',
  languageId: 'elm-native-diagnostic-driver',
  async format(textDocument) {
    const diagnostics = await ExtensionManagementWorker.invoke('Extensions.executeDiagnosticProvider', {
      ...textDocument,
      languageId: 'elm',
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
  argv: [],
  id: 'elm-language-server',
  languageId: 'elm',
  uri: globalThis.__ELM_LANGUAGE_SERVER_URI__,
})
