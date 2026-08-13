import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.zig-diagnostics'

export const test: Test = async ({ Editor, Extension, FileSystem, Main, Settings, Workspace }) => {
  const extensionUri = import.meta.resolve('../.tmp/zig-language-server')
  await Extension.addWebExtension(extensionUri)
  const fixtureUri = import.meta.resolve('../fixtures/zig-language-server/workspace')
  const memoryWorkspaceUri = await FileSystem.loadFixture(fixtureUri)
  const workspaceUri = await FileSystem.getTmpDir({ scheme: 'file' })
  await FileSystem.mkdir(`${workspaceUri}/src`)
  const relativePath = 'src/diagnostic.zig'
  const content = await FileSystem.readFile(`${memoryWorkspaceUri}/${relativePath}`)
  await FileSystem.writeFile(`${workspaceUri}/${relativePath}`, content)
  await Workspace.setPath(workspaceUri)

  await Settings.update({ 'editor.diagnostics': true })
  await Main.openUri(`${workspaceUri}/${relativePath}`)

  await Editor.shouldHaveDiagnostics([
    {
      columnIndex: 8,
      endColumnIndex: 20,
      endRowIndex: 1,
      message: "use of undeclared identifier 'unknown_name'",
      rowIndex: 1,
      source: 'zls',
      type: 'error',
    },
  ])
}
