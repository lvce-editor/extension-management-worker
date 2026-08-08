import type { Diagnostic, Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.typescript-native-diagnostics-unknown-name'

export const test: Test = async ({ Extension, FileSystem, Workspace }) => {
  const fixtureUri = import.meta.resolve('../fixtures/typescript-native-language-server/workspace')
  const workspaceUri = await FileSystem.loadFixture(fixtureUri)
  await Workspace.setPath(workspaceUri)
  const text = 'const value = missingValue'
  const edits = await Extension.executeFormattingProvider({
    languageId: 'typescript-native-diagnostic-driver',
    text,
    uri: `${workspaceUri}/src/diagnostic.ts`,
  })
  const diagnostics = JSON.parse(edits[0].inserted) as readonly Diagnostic[]

  const expected = [
    {
      columnIndex: 14,
      endColumnIndex: 26,
      endRowIndex: 0,
      message: "Cannot find name 'missingValue'.",
      rowIndex: 0,
      source: 'ts',
      type: 'error',
    },
  ]
  if (JSON.stringify(diagnostics) !== JSON.stringify(expected)) {
    throw new Error(`Expected diagnostics ${JSON.stringify(expected)}, got ${JSON.stringify(diagnostics)}`)
  }
}
