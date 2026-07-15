import { startLanguageServer } from './language-server-harness.js'

startLanguageServer(() => ({
  error: {
    code: -32_603,
    message: 'fixture language server rejected completion',
  },
}))
