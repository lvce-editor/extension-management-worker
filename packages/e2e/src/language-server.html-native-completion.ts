import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.html-native-completion'

export const test: Test = async ({ Editor, expect, FileSystem, Locator, Main, Workspace }) => {
  const fixtureUri = import.meta.resolve('../fixtures/vscode-native-language-servers/workspace')
  const workspaceUri = await FileSystem.loadFixture(fixtureUri)
  await Workspace.setPath(workspaceUri)
  await Main.openUri(`${workspaceUri}/index.html`)
  await Editor.setCursor(0, 3)

  await Editor.openCompletion()

  const completions = Locator('#Completions')
  await expect(completions).toBeVisible()
  const completionItem = Locator('.EditorCompletionItem', { hasText: 'div' })
  await expect(completionItem).toHaveText('div')
}
