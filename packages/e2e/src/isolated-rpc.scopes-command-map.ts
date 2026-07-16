import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'isolated-rpc.scopes-command-map'

export const test: Test = async ({ Extension }) => {
  const getDeclaredRpcInfo = async (): Promise<void> => {
    const edits = await Extension.executeFormattingProvider({
      languageId: 'isolated-rpc-with-declared-rpc',
      text: '',
    })
    const info = JSON.parse(edits[0].inserted)
    if (info.name !== 'Test Client') {
      throw new Error(`Expected Test Client rpc name, got ${JSON.stringify(info)}`)
    }
    if (!info.path.endsWith('/rpc-client.js')) {
      throw new Error(`Expected rpc-client.js path, got ${JSON.stringify(info)}`)
    }
  }

  const extensionWithRpcUri = import.meta.resolve('../.tmp/extension-with-rpc-command-map')
  await Extension.addWebExtension(extensionWithRpcUri)
  await getDeclaredRpcInfo()

  const extensionWithoutRpcUri = import.meta.resolve('../.tmp/extension-no-rpc-command-map')
  await Extension.addWebExtension(extensionWithoutRpcUri)
  await Extension.executeFormattingProvider({
    languageId: 'isolated-rpc-without-declared-rpc',
    text: '',
  })

  await getDeclaredRpcInfo()
}
