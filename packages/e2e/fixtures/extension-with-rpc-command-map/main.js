import { activate, registerFormattingProvider } from '@lvce-editor/api'
import { ExtensionManagementWorker } from '@lvce-editor/rpc-registry'

await activate()

registerFormattingProvider({
  id: 'isolated-rpc-with-declared-rpc',
  languageId: 'isolated-rpc-with-declared-rpc',
  async format() {
    let getInfoError = ''
    try {
      await ExtensionManagementWorker.invoke('Extensions.getNodeRpcInfo', 'test-client')
    } catch (error) {
      getInfoError = `${error}`
    }
    let createError = ''
    try {
      await ExtensionManagementWorker.invoke('Extensions.createNodeRpcConnection', 'test-client')
    } catch (error) {
      createError = `${error}`
    }
    return [
      {
        endOffset: 0,
        inserted: JSON.stringify({ createError, getInfoError }),
        startOffset: 0,
      },
    ]
  },
})
