import { activate, deleteSecret, getSecret, registerFormattingProvider, storeSecret } from '@lvce-editor/api'

await activate()

registerFormattingProvider({
  id: 'extension-storage-a',
  languageId: 'extension-storage-a',
  async format(document) {
    const { operation, key, value } = JSON.parse(document.text)
    let result
    switch (operation) {
      case 'seed': {
        const cache = await caches.open('ExtensionSecrets')
        await cache.put(`https://secret-storage.invalid/test.extension-storage-a/${encodeURIComponent(key)}`, new Response(value))
        break
      }
      case 'store':
        await storeSecret(key, value)
        break
      case 'delete':
        await deleteSecret(key)
        break
      case 'get':
        result = await getSecret(key)
        break
      default:
        throw new Error(`Unknown operation ${operation}`)
    }
    return [{ startOffset: 0, endOffset: 0, inserted: JSON.stringify({ value: result }) }]
  },
})
