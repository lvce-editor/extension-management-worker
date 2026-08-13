import type { Diagnostic, Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.typescript-native-diagnostics-multiple'

export const test: Test = async ({ Extension, FileSystem, Workspace }) => {
  const fixtureUri = import.meta.resolve('../fixtures/typescript-native-language-server/workspace')
  const workspaceUri = await FileSystem.loadFixture(fixtureUri)
  await Workspace.setPath(workspaceUri)
  const text = `const first: string = null
const second: number = "wrong"`
  const edits = await Extension.executeFormattingProvider({
    languageId: 'typescript-native-diagnostic-driver',
    text,
    uri: `${workspaceUri}/src/diagnostic.ts`,
  })
  const diagnostics = JSON.parse(edits[0].inserted) as readonly Diagnostic[]

  const expected = [
    {
      code: 2322,
      columnIndex: 6,
      endColumnIndex: 11,
      endRowIndex: 0,
      message: "Type 'null' is not assignable to type 'string'.",
      rowIndex: 0,
      source: 'ts',
      type: 'error',
    },
    {
      code: 2322,
      columnIndex: 6,
      endColumnIndex: 12,
      endRowIndex: 1,
      message: "Type 'string' is not assignable to type 'number'.",
      rowIndex: 1,
      source: 'ts',
      type: 'error',
    },
  ]
  if (JSON.stringify(diagnostics) !== JSON.stringify(expected)) {
    throw new Error(`Expected diagnostics ${JSON.stringify(expected)}, got ${JSON.stringify(diagnostics)}`)
  }
}
