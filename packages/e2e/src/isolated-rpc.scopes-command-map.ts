import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'isolated-rpc.scopes-command-map'

export const skip = 1

export const test: Test = async ({ Extension }) => {
  const verifyScopedRpcPolicy = async (): Promise<void> => {
    const edits = await Extension.executeFormattingProvider({
      languageId: 'isolated-rpc-with-declared-rpc',
      text: '',
    })
    const result = JSON.parse(edits[0].inserted)
    if (!result.getInfoError.includes('Command not found Extensions.getNodeRpcInfo')) {
      throw new Error(`Expected resolved rpc paths to be unavailable, got ${JSON.stringify(result)}`)
    }
    if (!result.createError.includes('only available to built-in extensions')) {
      throw new Error(`Expected third-party node rpc creation to be rejected, got ${JSON.stringify(result)}`)
    }
  }

  const extensionWithRpcUri = import.meta.resolve('../.tmp/extension-with-rpc-command-map')
  await Extension.addWebExtension(extensionWithRpcUri)
  await verifyScopedRpcPolicy()

  const extensionWithoutRpcUri = import.meta.resolve('../.tmp/extension-no-rpc-command-map')
  await Extension.addWebExtension(extensionWithoutRpcUri)
  await Extension.executeFormattingProvider({
    languageId: 'isolated-rpc-without-declared-rpc',
    text: '',
  })

  await verifyScopedRpcPolicy()
}
