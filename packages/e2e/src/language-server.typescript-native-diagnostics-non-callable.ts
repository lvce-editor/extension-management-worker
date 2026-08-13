import type { Diagnostic, Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.typescript-native-diagnostics-non-callable'

export const test: Test = async ({ Extension, FileSystem, Workspace }) => {
  const fixtureUri = import.meta.resolve('../fixtures/typescript-native-language-server/workspace')
  const workspaceUri = await FileSystem.loadFixture(fixtureUri)
  await Workspace.setPath(workspaceUri)
  const text = `const value = 1
value()`
  const edits = await Extension.executeFormattingProvider({
    languageId: 'typescript-native-diagnostic-driver',
    text,
    uri: `${workspaceUri}/src/diagnostic.ts`,
  })
  const diagnostics = JSON.parse(edits[0].inserted) as readonly Diagnostic[]

  const expected = [
    {
      code: 2349,
      columnIndex: 0,
      endColumnIndex: 5,
      endRowIndex: 1,
      message: "This expression is not callable.\n  Type 'Number' has no call signatures.",
      rowIndex: 1,
      source: 'ts',
      type: 'error',
    },
  ]
  if (JSON.stringify(diagnostics) !== JSON.stringify(expected)) {
    throw new Error(`Expected diagnostics ${JSON.stringify(expected)}, got ${JSON.stringify(diagnostics)}`)
  }
}
