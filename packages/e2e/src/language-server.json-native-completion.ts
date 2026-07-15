import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.json-native-completion'

export const test: Test = async ({ Editor, expect, FileSystem, Locator, Main, Workspace }) => {
  const fixtureUri = import.meta.resolve('../fixtures/vscode-native-language-servers/workspace')
  const workspaceUri = await FileSystem.loadFixture(fixtureUri)
  await Workspace.setPath(workspaceUri)
  await Main.openUri(`${workspaceUri}/settings.json`)
  await Editor.setCursor(2, 9)

  await Editor.openCompletion()

  const completions = Locator('#Completions')
  await expect(completions).toBeVisible()
  const completionItem = Locator('.EditorCompletionItem', { hasText: 'nativeLanguageServerSetting' })
  await expect(completionItem).toHaveText('nativeLanguageServerSetting')
}
