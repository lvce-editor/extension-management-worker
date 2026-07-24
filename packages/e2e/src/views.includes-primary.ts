import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'views.includes-primary'

export const test: Test = async ({ Command, Extension }) => {
  const extensionUri = import.meta.resolve('../fixtures/extension-contributions')
  await Extension.addWebExtension(extensionUri)
  const extension = await Command.execute('ExtensionManagement.getExtension', 'test.extension-contributions')
  const { views } = extension
  if (!Array.isArray(views)) {
    throw new TypeError(`Expected views to be an array, got ${JSON.stringify(views)}`)
  }
  const view = views.find((item) => item.id === 'test.primary-view')
  const expected = {
    kind: 'tree',
    selector: ['.item', 7, '.label'],
    title: 'Primary View',
  }
  const actual = {
    kind: view?.kind,
    selector: view?.selector,
    title: view?.title,
  }
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected primary view ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}
