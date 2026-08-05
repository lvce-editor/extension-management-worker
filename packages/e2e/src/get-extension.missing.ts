import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'get-extension.missing'

export const test: Test = async ({ Command }) => {
  const extension = await Command.execute('ExtensionManagement.getExtension', 'test.missing-extension')
  if (extension !== undefined) {
    throw new Error(`Expected missing extension to be undefined, got ${JSON.stringify(extension)}`)
  }
}
