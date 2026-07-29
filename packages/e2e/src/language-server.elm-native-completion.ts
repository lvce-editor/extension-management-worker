import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.elm-native-completion'

export const test: Test = async ({ Editor, expect, Extension, FileSystem, Locator, Main, Workspace }) => {
  const extensionUri = import.meta.resolve('../.tmp/elm-native-language-server')
  await Extension.addWebExtension(extensionUri)
  const fixtureUri = import.meta.resolve('../fixtures/elm-native-language-server/workspace')
  const workspaceUri = await FileSystem.loadFixture(fixtureUri)
  await Workspace.setPath(workspaceUri)
  await Main.openUri(`${workspaceUri}/src/Completion.elm`)
  await Editor.setCursor(12, 14)

  await Editor.openCompletion()

  const completions = Locator('#Completions')
  await expect(completions).toBeVisible()
  const completionItem = Locator('.EditorCompletionItem', { hasText: 'greeting' })
  await expect(completionItem).toHaveText('greeting')
}
