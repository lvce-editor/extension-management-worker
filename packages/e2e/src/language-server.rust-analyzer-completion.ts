import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.rust-analyzer-completion'

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
  const completionItems = await Extension.executeCompletionProvider(
    {
      languageId: 'rust',
      text: rustSource,
      uri: `${workspaceUri}/src/main.rs`,
    },
    offset,
  )
  if (completionItems.every((item) => !item.label?.startsWith(expectedCompletion))) {
    throw new Error(`Expected Rust Analyzer completion, got ${JSON.stringify(completionItems)}`)
  }
}
