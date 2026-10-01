import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'extension-storage.secrets'

export const test: Test = async ({ Extension }) => {
  await Extension.addWebExtension(import.meta.resolve('../.tmp/extension-storage-a'))
  await Extension.addWebExtension(import.meta.resolve('../.tmp/extension-storage-b'))
  const key = 'secret / 日本語'
  const invoke = async (extension: string, operation: string, value?: string): Promise<string | undefined> => {
    const edits = await Extension.executeFormattingProvider({
      languageId: `extension-storage-${extension}`,
      text: JSON.stringify({ key, operation, value }),
    })
    // JSON-RPC encodes an undefined result as null.
    return JSON.parse(edits[0].inserted).value ?? undefined
  }
  const check = async (extension: string, expected: string | undefined): Promise<void> => {
    const actual = await invoke(extension, 'get')
    if (actual !== expected) {
      throw new Error(`Expected secret ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    }
  }

  await check('a', undefined)
  await invoke('a', 'seed', 'legacy 日本語')
  await check('a', 'legacy 日本語')
  await check('b', undefined)
  await invoke('b', 'store', 'other extension')
  await invoke('a', 'store', 'updated 🔐')
  await check('a', 'updated 🔐')
  await check('b', 'other extension')
  await invoke('a', 'store', '')
  await check('a', '')
  await invoke('a', 'delete')
  await check('a', undefined)
  await check('b', 'other extension')
  await invoke('b', 'delete')
  await check('b', undefined)
}
