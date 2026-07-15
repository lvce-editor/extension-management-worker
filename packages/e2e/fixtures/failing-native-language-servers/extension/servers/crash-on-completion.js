import { startLanguageServer } from './language-server-harness.js'

startLanguageServer(() => {
  throw new Error('fixture language server crashed while completing')
})
