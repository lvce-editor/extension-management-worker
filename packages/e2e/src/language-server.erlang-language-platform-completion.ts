import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.erlang-language-platform-completion'

const wait = (duration: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}

export const test: Test = async ({ Editor, expect, Extension, FileSystem, Locator, Main, Workspace }) => {
  const extensionUri = import.meta.resolve('../.tmp/erlang-language-platform')
  await Extension.addWebExtension(extensionUri)
  const fixtureUri = import.meta.resolve('../fixtures/erlang-language-platform/workspace')
  const memoryWorkspaceUri = await FileSystem.loadFixture(fixtureUri)
  const temporaryWorkspaceUri = await FileSystem.getTmpDir({ scheme: 'file' })
  const workspaceUri = /^file:\/\/\/[a-z]:/i.test(temporaryWorkspaceUri) ? temporaryWorkspaceUri.toLowerCase() : temporaryWorkspaceUri
  await FileSystem.mkdir(`${workspaceUri}/src`)
  for (const relativePath of ['.elp.toml', 'build_info.json', 'src/completion.erl', 'src/diagnostic.erl']) {
    const content = await FileSystem.readFile(`${memoryWorkspaceUri}/${relativePath}`)
    await FileSystem.writeFile(`${workspaceUri}/${relativePath}`, content)
  }
  await Workspace.setPath(workspaceUri)
  const documentUri = `${workspaceUri}/src/completion.erl`
  const source = await FileSystem.readFile(documentUri)
  const expectedCompletionName = 'native_language_server_completion'
  const completionPrefix = expectedCompletionName.slice(0, -5)
  const offset = source.lastIndexOf(completionPrefix) + completionPrefix.length
  const expectedCompletion = `${expectedCompletionName}/0`
  let lastCompletionItems: readonly { readonly label?: string }[] = []
  for (let attempt = 0; attempt < 40; attempt++) {
    lastCompletionItems = await Extension.executeCompletionProvider(
      {
        languageId: 'erlang',
        text: source,
        uri: documentUri,
      },
      offset,
    )
    if (lastCompletionItems.some((item) => item.label === expectedCompletion)) {
      break
    }
    await wait(250)
  }
  if (lastCompletionItems.every((item) => item.label !== expectedCompletion)) {
    throw new Error(`Expected Erlang Language Platform completion, got ${JSON.stringify(lastCompletionItems)}`)
  }

  await Main.openUri(documentUri)
  await Editor.setCursor(7, 32)
  await Editor.openCompletion()

  const completions = Locator('#Completions')
  await expect(completions).toBeVisible()
  const completionItem = Locator('.EditorCompletionItem', { hasText: expectedCompletion })
  await expect(completionItem).toHaveText(expectedCompletion)
}
