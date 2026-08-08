import type { Diagnostic, Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.typescript-native-diagnostics-argument-type'

export const test: Test = async ({ Extension, FileSystem, Workspace }) => {
  const fixtureUri = import.meta.resolve('../fixtures/typescript-native-language-server/workspace')
  const workspaceUri = await FileSystem.loadFixture(fixtureUri)
  await Workspace.setPath(workspaceUri)
  const text = `function takesNumber(value: number) {}
takesNumber("wrong")`
  const edits = await Extension.executeFormattingProvider({
    languageId: 'typescript-native-diagnostic-driver',
    text,
    uri: `${workspaceUri}/src/diagnostic.ts`,
  })
  const diagnostics = JSON.parse(edits[0].inserted) as readonly Diagnostic[]

  const expected = [
    {
      columnIndex: 12,
      endColumnIndex: 19,
      endRowIndex: 1,
      message: "Argument of type 'string' is not assignable to parameter of type 'number'.",
      rowIndex: 1,
      source: 'ts',
      type: 'error',
    },
    {
      columnIndex: 21,
      endColumnIndex: 26,
      endRowIndex: 0,
      message: "'value' is declared but its value is never read.",
      rowIndex: 0,
      source: 'ts',
      type: 'warning',
    },
  ]
  if (JSON.stringify(diagnostics) !== JSON.stringify(expected)) {
    throw new Error(`Expected diagnostics ${JSON.stringify(expected)}, got ${JSON.stringify(diagnostics)}`)
  }
}
