import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.typescript-native-completion'

export const test: Test = async ({ Editor, EditorCompletion, expect, FileSystem, Locator, Main, Workspace }) => {
  const fixtureUri = import.meta.resolve('../fixtures/typescript-native-language-server/workspace')
  const workspaceUri = await FileSystem.loadFixture(fixtureUri)
  await Workspace.setPath(workspaceUri)
  await Main.openUri(`${workspaceUri}/src/test.ts`)
  await Editor.setCursor(2, 25)

  await Editor.openCompletion()

  const completions = Locator('#Completions')
  await expect(completions).toBeVisible()
  const completionItems = completions.locator('.EditorCompletionItem')
  await expect(completionItems).toHaveCount(1)
  const firstCompletionItem = completionItems.nth(0)
  await expect(firstCompletionItem).toHaveText('nativeLanguageServerCompletion')

  await EditorCompletion.close()
  const updatedPrefix = 'updatedLanguageServer'
  await Editor.setText(`const updatedLanguageServerCompletion = 2

${updatedPrefix}`)
  await Editor.setCursor(2, updatedPrefix.length)

  await Editor.openCompletion()

  const updatedCompletions = Locator('#Completions').nth(1)
  await expect(updatedCompletions).toBeVisible()
  const updatedCompletionItems = updatedCompletions.locator('.EditorCompletionItem')
  await expect(updatedCompletionItems).toHaveCount(1)
  const updatedCompletionItem = updatedCompletionItems.nth(0)
  await expect(updatedCompletionItem).toHaveText('updatedLanguageServerCompletion')
}
