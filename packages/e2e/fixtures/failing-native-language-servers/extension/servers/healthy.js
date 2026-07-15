import { startLanguageServer } from './language-server-harness.js'

startLanguageServer(() => ({
  result: {
    items: [
      {
        kind: 1,
        label: 'healthyLanguageServerCompletion',
      },
    ],
  },
}))
