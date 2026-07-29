import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.elm-native-diagnostics'

export const test: Test = async ({ Extension, FileSystem, Workspace }) => {
  const extensionUri = import.meta.resolve('../.tmp/elm-native-language-server')
  await Extension.addWebExtension(extensionUri)
  const fixtureUri = import.meta.resolve('../fixtures/elm-native-language-server/workspace')
  const workspaceUri = await FileSystem.loadFixture(fixtureUri)
  await Workspace.setPath(workspaceUri)

  const diagnosticDocument = {
    languageId: 'elm-native-diagnostic-driver',
    text: `module Diagnostic exposing (main)

import Html exposing (Html, text)


main : Html msg
main =
    text missingValue`,
    uri: `${workspaceUri}/src/Diagnostic.elm`,
  }
  const diagnosticEdits = await Extension.executeFormattingProvider(diagnosticDocument)
  const diagnostics = JSON.parse(diagnosticEdits[0].inserted) as readonly { readonly message?: string }[]
  if (diagnostics.every((diagnostic) => !diagnostic.message?.includes('missingValue'))) {
    throw new Error(`Expected Elm diagnostics for missingValue, got ${diagnosticEdits[0].inserted}`)
  }

  const updatedEdits = await Extension.executeFormattingProvider({
    ...diagnosticDocument,
    text: diagnosticDocument.text.replace('missingValue', '"Hello"'),
  })
  if (updatedEdits[0].inserted !== '[]') {
    throw new Error(`Expected Elm diagnostics to clear, got ${updatedEdits[0].inserted}`)
  }
}
