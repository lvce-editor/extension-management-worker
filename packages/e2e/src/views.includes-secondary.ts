import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'views.includes-secondary'

export const test: Test = async ({ Command, Extension }) => {
  const extensionUri = import.meta.resolve('../fixtures/extension-contributions')
  await Extension.addWebExtension(extensionUri)
  const extension = await Command.execute('ExtensionManagement.getExtension', 'test.extension-contributions')
  const { views } = extension
  if (!Array.isArray(views)) {
    throw new TypeError(`Expected views to be an array, got ${JSON.stringify(views)}`)
  }
  const view = views.find((item) => item.id === 'test.secondary-view')
  if (view?.id !== 'test.secondary-view') {
    throw new Error(`Expected secondary contributed view, got ${JSON.stringify(view)}`)
  }
}
