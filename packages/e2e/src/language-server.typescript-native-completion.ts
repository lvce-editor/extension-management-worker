import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.typescript-native-completion'

export const test: Test = async ({ Editor, expect, Extension, FileSystem, Locator, Main, Workspace }) => {
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

  const updatedText = `const updatedLanguageServerCompletion = 2

updatedLanguageServer`
  const updatedCompletionItems = await Extension.executeCompletionProvider(
    {
      languageId: 'typescript-native',
      text: updatedText,
      uri: `${workspaceUri}/src/test.ts`,
    },
    updatedText.length,
  )
  if (updatedCompletionItems.every((item) => item.label !== 'updatedLanguageServerCompletion')) {
    throw new Error('Expected updated TypeScript language server completion')
  }
  if (updatedCompletionItems.some((item) => item.label === 'nativeLanguageServerCompletion')) {
    throw new Error('Expected stale TypeScript language server completion to be removed')
  }
}
