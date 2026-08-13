import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.zig-definition'

export const test: Test = async ({ Editor, Extension, FileSystem, Main, Workspace }) => {
  const extensionUri = import.meta.resolve('../.tmp/zig-language-server')
  await Extension.addWebExtension(extensionUri)
  const fixtureUri = import.meta.resolve('../fixtures/zig-language-server/workspace')
  const memoryWorkspaceUri = await FileSystem.loadFixture(fixtureUri)
  const workspaceUri = await FileSystem.getTmpDir({ scheme: 'file' })
  await FileSystem.mkdir(`${workspaceUri}/src`)
  const relativePath = 'src/definition.zig'
  const content = await FileSystem.readFile(`${memoryWorkspaceUri}/${relativePath}`)
  await FileSystem.writeFile(`${workspaceUri}/${relativePath}`, content)
  await Workspace.setPath(workspaceUri)
  await Main.openUri(`${workspaceUri}/${relativePath}`)
  await Editor.setCursor(3, 12)

  await Editor.goToDefinition()

  const selections = await Editor.getSelections()
  const expectedPoint = new Uint32Array([0, 6, 0, 6])
  const expectedSymbol = new Uint32Array([0, 6, 0, 14])
  const matches = (expected: Uint32Array): boolean => selections.every((value, index) => value === expected[index])
  if (!matches(expectedPoint) && !matches(expectedSymbol)) {
    throw new Error(`Expected editor to navigate to the greeting declaration but was ${selections}`)
  }
}
