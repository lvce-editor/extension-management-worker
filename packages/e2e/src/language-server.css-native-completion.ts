import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.css-native-completion'

export const test: Test = async ({ Editor, expect, Extension, FileSystem, Locator, Main, Workspace }) => {
  const extensionUri = import.meta.resolve('../fixtures/vscode-native-language-servers/extension')
  await Extension.addWebExtension(extensionUri)
  const fixtureUri = import.meta.resolve('../fixtures/vscode-native-language-servers/workspace')
  const workspaceUri = await FileSystem.loadFixture(fixtureUri)
  await Workspace.setPath(workspaceUri)
  await Main.openUri(`${workspaceUri}/styles.css`)
  await Editor.setCursor(1, 5)

  await Editor.openCompletion()

  const completions = Locator('#Completions')
  await expect(completions).toBeVisible()
  const completionItem = Locator('.EditorCompletionItem', { hasText: 'display' })
  await expect(completionItem).toHaveText('display')
}
