import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'workspace-enable-extension.search-context-menu'

export const skip = 1

export const test: Test = async ({ Command, ContextMenu, Extension, ExtensionSearch, FileSystem, Workspace }) => {
  const workspaceUri = await Workspace.openTmpDir()
  const extensionUri = import.meta.resolve('../fixtures/extension-enable')
  await Extension.addWebExtension(extensionUri)
  await Command.execute('Extensions.disableWorkspace', 'test.extension-enable')
  await ExtensionSearch.open()
  await ExtensionSearch.handleInput('test.extension-enable')

  await ExtensionSearch.handleContextMenu(2, 10, 10)
  await ContextMenu.selectItem('Enable (Workspace)')

  await FileSystem.shouldHaveFile(`${workspaceUri}/.lvce/disabled-extensions.json`, '{\n  "disabledExtensions": []\n}\n')
}
