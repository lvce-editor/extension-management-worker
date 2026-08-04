import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.java-completion'

const wait = (duration: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}

export const test: Test = async ({ Editor, expect, Extension, FileSystem, Locator, Main, Workspace }) => {
  const extensionUri = import.meta.resolve('../.tmp/java-language-server')
  await Extension.addWebExtension(extensionUri)
  const fixtureUri = import.meta.resolve('../fixtures/java-language-server/workspace')
  const memoryWorkspaceUri = await FileSystem.loadFixture(fixtureUri)
  const workspaceUri = await FileSystem.getTmpDir({ scheme: 'file' })
  await FileSystem.mkdir(`${workspaceUri}/src/main/java/test`)
  let javaSource = ''
  for (const relativePath of ['pom.xml', 'src/main/java/test/Main.java']) {
    const content = await FileSystem.readFile(`${memoryWorkspaceUri}/${relativePath}`)
    await FileSystem.writeFile(`${workspaceUri}/${relativePath}`, content)
    if (relativePath.endsWith('.java')) {
      javaSource = content
    }
  }
  await Workspace.setPath(workspaceUri)
  await Main.openUri(`${workspaceUri}/src/main/java/test/Main.java`)
  await Editor.setCursor(6, 52)

  const expectedCompletion = 'nativeLanguageServerCompletion'
  const completionPrefix = expectedCompletion.slice(0, -5)
  const offset = javaSource.lastIndexOf(completionPrefix) + completionPrefix.length
  let lastCompletionItems: readonly { readonly label?: string }[] = []
  for (let attempt = 0; attempt < 40; attempt++) {
    lastCompletionItems = await Extension.executeCompletionProvider(
      {
        languageId: 'java',
        text: javaSource,
        uri: `${workspaceUri}/src/main/java/test/Main.java`,
      },
      offset,
    )
    if (lastCompletionItems.some((item) => item.label?.startsWith(expectedCompletion))) {
      break
    }
    await wait(250)
  }
  if (lastCompletionItems.every((item) => !item.label?.startsWith(expectedCompletion))) {
    throw new Error(`Expected vscode-java completion, got ${JSON.stringify(lastCompletionItems)}`)
  }

  await Editor.openCompletion()

  const completions = Locator('#Completions')
  await expect(completions).toBeVisible()
  const completionItem = Locator('.EditorCompletionItem', { hasText: expectedCompletion })
  await expect(completionItem).toBeVisible()
}
