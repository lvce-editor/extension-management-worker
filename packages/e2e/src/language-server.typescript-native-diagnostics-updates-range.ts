import type { Diagnostic, Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.typescript-native-diagnostics-updates-range'

export const test: Test = async ({ Extension, FileSystem, Workspace }) => {
  const fixtureUri = import.meta.resolve('../fixtures/typescript-native-language-server/workspace')
  const workspaceUri = await FileSystem.loadFixture(fixtureUri)
  await Workspace.setPath(workspaceUri)
  const uri = `${workspaceUri}/src/diagnostic.ts`
  await Extension.executeFormattingProvider({
    languageId: 'typescript-native-diagnostic-driver',
    text: 'const value = missingValue',
    uri,
  })
  const edits = await Extension.executeFormattingProvider({
    languageId: 'typescript-native-diagnostic-driver',
    text: `const prefix = 1
const value = missingValue`,
    uri,
  })
  const diagnostics = JSON.parse(edits[0].inserted) as readonly Diagnostic[]

  const expected = [
    {
      columnIndex: 14,
      endColumnIndex: 26,
      endRowIndex: 1,
      message: "Cannot find name 'missingValue'.",
      rowIndex: 1,
      source: 'ts',
      type: 'error',
    },
  ]
  if (JSON.stringify(diagnostics) !== JSON.stringify(expected)) {
    throw new Error(`Expected diagnostics ${JSON.stringify(expected)}, got ${JSON.stringify(diagnostics)}`)
  }
}
