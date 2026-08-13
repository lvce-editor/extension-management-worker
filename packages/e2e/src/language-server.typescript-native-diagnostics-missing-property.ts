import type { Diagnostic, Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.typescript-native-diagnostics-missing-property'

export const test: Test = async ({ Extension, FileSystem, Workspace }) => {
  const fixtureUri = import.meta.resolve('../fixtures/typescript-native-language-server/workspace')
  const workspaceUri = await FileSystem.loadFixture(fixtureUri)
  await Workspace.setPath(workspaceUri)
  const text = `const value = { name: "ok" }
value.missing`
  const edits = await Extension.executeFormattingProvider({
    languageId: 'typescript-native-diagnostic-driver',
    text,
    uri: `${workspaceUri}/src/diagnostic.ts`,
  })
  const diagnostics = JSON.parse(edits[0].inserted) as readonly Diagnostic[]

  const expected = [
    {
      code: 2339,
      columnIndex: 6,
      endColumnIndex: 13,
      endRowIndex: 1,
      message: "Property 'missing' does not exist on type '{ name: string; }'.",
      rowIndex: 1,
      source: 'ts',
      type: 'error',
    },
  ]
  if (JSON.stringify(diagnostics) !== JSON.stringify(expected)) {
    throw new Error(`Expected diagnostics ${JSON.stringify(expected)}, got ${JSON.stringify(diagnostics)}`)
  }
}
