import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.typescript-native-diagnostics'

export const test: Test = async ({ Editor, FileSystem, Main, Workspace }) => {
  const fixtureUri = import.meta.resolve('../fixtures/typescript-native-language-server/workspace')
  const workspaceUri = await FileSystem.loadFixture(fixtureUri)
  await Workspace.setPath(workspaceUri)
  await Main.openUri(`${workspaceUri}/src/diagnostic.ts`)

  await Editor.shouldHaveDiagnosticProviderResult([
    {
      columnIndex: 6,
      endColumnIndex: 11,
      endRowIndex: 0,
      message: "Type 'null' is not assignable to type 'string'.",
      rowIndex: 0,
      source: 'ts',
      type: 'error',
    },
  ])

  await Editor.setText("const value: string = 'valid'")

  await Editor.shouldHaveDiagnosticProviderResult([])
}
