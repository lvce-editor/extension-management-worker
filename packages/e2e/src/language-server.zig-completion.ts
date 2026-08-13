import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.zig-completion'

export const test: Test = async ({ Editor, expect, Extension, FileSystem, Locator, Main, Workspace }) => {
  const extensionUri = import.meta.resolve('../.tmp/zig-language-server')
  await Extension.addWebExtension(extensionUri)
  const fixtureUri = import.meta.resolve('../fixtures/zig-language-server/workspace')
  const memoryWorkspaceUri = await FileSystem.loadFixture(fixtureUri)
  const workspaceUri = await FileSystem.getTmpDir({ scheme: 'file' })
  await FileSystem.mkdir(`${workspaceUri}/src`)
  const relativePath = 'src/completion.zig'
  const content = await FileSystem.readFile(`${memoryWorkspaceUri}/${relativePath}`)
  await FileSystem.writeFile(`${workspaceUri}/${relativePath}`, content)
  await Workspace.setPath(workspaceUri)
  await Main.openUri(`${workspaceUri}/${relativePath}`)
  await Editor.setCursor(3, 11)

  await Editor.openCompletion()

  const completions = Locator('#Completions')
  await expect(completions).toBeVisible()
  const completionItem = Locator('.EditorCompletionItem', { hasText: 'greeting' })
  await expect(completionItem).toHaveText('greeting')
}
