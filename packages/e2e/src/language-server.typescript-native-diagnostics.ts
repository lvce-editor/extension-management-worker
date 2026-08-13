import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.typescript-native-diagnostics'

export const test: Test = async ({ Extension, FileSystem, Workspace }) => {
  const fixtureUri = import.meta.resolve('../fixtures/typescript-native-language-server/workspace')
  const workspaceUri = await FileSystem.loadFixture(fixtureUri)
  await Workspace.setPath(workspaceUri)

  const expectedDiagnostics = [
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
  ]
  const diagnosticDocument = {
    languageId: 'typescript-native-diagnostic-driver',
    text: 'const value: string = null',
    uri: `${workspaceUri}/src/diagnostic.ts`,
  }
  const diagnosticEdits = await Extension.executeFormattingProvider(diagnosticDocument)
  if (diagnosticEdits[0].inserted !== JSON.stringify(expectedDiagnostics)) {
    throw new Error(`Expected TypeScript diagnostics ${JSON.stringify(expectedDiagnostics)}, got ${diagnosticEdits[0].inserted}`)
  }

  const updatedEdits = await Extension.executeFormattingProvider({
    ...diagnosticDocument,
    text: "const value: string = 'valid'",
  })
  if (updatedEdits[0].inserted !== '[]') {
    throw new Error(`Expected TypeScript diagnostics to clear, got ${updatedEdits[0].inserted}`)
  }
}
