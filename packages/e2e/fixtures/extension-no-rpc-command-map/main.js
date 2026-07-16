import { activate, registerFormattingProvider } from '@lvce-editor/api'

await activate()

registerFormattingProvider({
  id: 'isolated-rpc-without-declared-rpc',
  languageId: 'isolated-rpc-without-declared-rpc',
  format() {
    return []
  },
})
