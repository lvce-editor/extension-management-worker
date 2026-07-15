import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.rejects-completion'

export const test: Test = async ({ Editor, expect, Extension, FileSystem, Locator, Main, Workspace }) => {
  const extensionUri = import.meta.resolve('../fixtures/failing-native-language-servers/extension')
  await Extension.addWebExtension(extensionUri)
  const fixtureUri = import.meta.resolve('../fixtures/failing-native-language-servers/workspace')
  const workspaceUri = await FileSystem.loadFixture(fixtureUri)
  await Workspace.setPath(workspaceUri)
  await Main.openUri(`${workspaceUri}/reject-completion.reject-completion`)
  await Editor.setCursor(0, 4)

  await Editor.openCompletion()

  const completions = Locator('#Completions')
  await expect(completions).not.toBeVisible()

  await Main.openUri(`${workspaceUri}/healthy.healthy`)
  await Editor.setCursor(0, 4)
  await Editor.openCompletion()
  await expect(completions).toBeVisible()
  const completionItem = Locator('.EditorCompletionItem')
  await expect(completionItem).toHaveText('healthyLanguageServerCompletion')
}
