import { activate, registerFormattingProvider } from '@lvce-editor/api'
import { ExtensionManagementWorker } from '@lvce-editor/rpc-registry'

await activate()

registerFormattingProvider({
  id: 'isolated-rpc-with-declared-rpc',
  languageId: 'isolated-rpc-with-declared-rpc',
  async format() {
    const info = await ExtensionManagementWorker.invoke('Extensions.getNodeRpcInfo', 'test-client')
    return [
      {
        endOffset: 0,
        inserted: JSON.stringify(info),
        startOffset: 0,
      },
    ]
  },
})
