import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.elm-native-definition'

export const test: Test = async ({ Editor, Extension, FileSystem, Main, Workspace }) => {
  const extensionUri = import.meta.resolve('../.tmp/elm-native-language-server')
  await Extension.addWebExtension(extensionUri)
  const fixtureUri = import.meta.resolve('../fixtures/elm-native-language-server/workspace')
  const memoryWorkspaceUri = await FileSystem.loadFixture(fixtureUri)
  const workspaceUri = await FileSystem.getTmpDir({ scheme: 'file' })
  await FileSystem.mkdir(`${workspaceUri}/src`)
  for (const relativePath of ['elm.json', 'src/Definition.elm']) {
    const content = await FileSystem.readFile(`${memoryWorkspaceUri}/${relativePath}`)
    await FileSystem.writeFile(`${workspaceUri}/${relativePath}`, content)
  }
  await Workspace.setPath(workspaceUri)
  await Main.openUri(`${workspaceUri}/src/Definition.elm`)
  await Editor.setCursor(12, 14)

  await Editor.goToDefinition()

  const selections = await Editor.getSelections()
  const expectedPoint = new Uint32Array([6, 0, 6, 0])
  const expectedSymbol = new Uint32Array([6, 0, 6, 8])
  const matches = (expected: Uint32Array): boolean => selections.every((value, index) => value === expected[index])
  if (!matches(expectedPoint) && !matches(expectedSymbol)) {
    throw new Error(`Expected editor to navigate to the greeting declaration but was ${selections}`)
  }
}
