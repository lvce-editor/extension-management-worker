import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.elm-native-definition'

export const skip = 1

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

  await Editor.shouldHaveSelections(new Uint32Array([5, 0, 5, 0]))
}
