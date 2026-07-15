import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.exit-zero-on-start'

export const test: Test = async ({ Editor, expect, FileSystem, Locator, Main, Workspace }) => {
  const fixtureUri = import.meta.resolve('../fixtures/failing-native-language-servers/workspace')
  const workspaceUri = await FileSystem.loadFixture(fixtureUri)
  await Workspace.setPath(workspaceUri)
  await Main.openUri(`${workspaceUri}/exit-zero.exit-zero`)
  await Editor.setCursor(0, 4)

  await Editor.openCompletion()

  const completionItems = Locator('#Completions .EditorCompletionItem')
  await expect(completionItems).toHaveCount(0)

  await Main.openUri(`${workspaceUri}/healthy.healthy`)
  await Editor.setCursor(0, 4)
  await Editor.openCompletion()
  const completionItem = Locator('.EditorCompletionItem', { hasText: 'healthyLanguageServerCompletion' })
  await expect(completionItem).toHaveText('healthyLanguageServerCompletion')
}
