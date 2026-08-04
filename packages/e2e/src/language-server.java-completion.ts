import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.java-completion'

export const test: Test = async ({ Editor, expect, Extension, FileSystem, Locator, Main, Workspace }) => {
  const extensionUri = import.meta.resolve('../.tmp/java-language-server')
  await Extension.addWebExtension(extensionUri)
  const fixtureUri = import.meta.resolve('../fixtures/java-language-server/workspace')
  const memoryWorkspaceUri = await FileSystem.loadFixture(fixtureUri)
  const workspaceUri = await FileSystem.getTmpDir({ scheme: 'file' })
  await FileSystem.mkdir(`${workspaceUri}/src/main/java/test`)
  for (const relativePath of ['pom.xml', 'src/main/java/test/Main.java']) {
    const content = await FileSystem.readFile(`${memoryWorkspaceUri}/${relativePath}`)
    await FileSystem.writeFile(`${workspaceUri}/${relativePath}`, content)
  }
  await Workspace.setPath(workspaceUri)
  await Main.openUri(`${workspaceUri}/src/main/java/test/Main.java`)
  await Editor.setCursor(6, 52)

  await Editor.openCompletion()

  const completions = Locator('#Completions')
  await expect(completions).toBeVisible()
  const completionItem = Locator('.EditorCompletionItem', { hasText: 'nativeLanguageServerCompletion' })
  await expect(completionItem).toHaveText('nativeLanguageServerCompletion')
}
