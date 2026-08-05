import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.rust-analyzer-completion'

const wait = (duration: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}

export const test: Test = async ({ Extension, FileSystem, Workspace }) => {
  const extensionUri = import.meta.resolve('../.tmp/rust-analyzer-language-server')
  await Extension.addWebExtension(extensionUri)
  const fixtureUri = import.meta.resolve('../fixtures/rust-analyzer-language-server/workspace')
  const memoryWorkspaceUri = await FileSystem.loadFixture(fixtureUri)
  const workspaceUri = await FileSystem.getTmpDir({ scheme: 'file' })
  await FileSystem.mkdir(`${workspaceUri}/src`)
  let rustSource = ''
  for (const relativePath of ['Cargo.toml', 'src/main.rs']) {
    const content = await FileSystem.readFile(`${memoryWorkspaceUri}/${relativePath}`)
    await FileSystem.writeFile(`${workspaceUri}/${relativePath}`, content)
    if (relativePath === 'src/main.rs') {
      rustSource = content
    }
  }
  await Workspace.setPath(workspaceUri)
  const expectedCompletion = 'native_language_server_completion'
  const completionPrefix = expectedCompletion.slice(0, -5)
  const offset = rustSource.lastIndexOf(completionPrefix) + completionPrefix.length
  let lastCompletionItems: readonly { readonly label?: string }[] = []
  for (let attempt = 0; attempt < 20; attempt++) {
    lastCompletionItems = await Extension.executeCompletionProvider(
      {
        languageId: 'rust',
        text: rustSource,
        uri: `${workspaceUri}/src/main.rs`,
      },
      offset,
    )
    if (lastCompletionItems.some((item) => item.label?.startsWith(expectedCompletion))) {
      return
    }
    await wait(250)
  }
  throw new Error(`Expected Rust Analyzer completion, got ${JSON.stringify(lastCompletionItems)}`)
}
