import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'reference-provider.isolated'

export const test: Test = async ({ Command }) => {
  const activationResult = await Command.execute('Extensions.activateByEvent', 'onReferences:reference-e2e', '', 2)
  if (activationResult.hasActivatedExtensions !== true) {
    throw new Error(`Expected reference extension to be activated, got ${JSON.stringify(activationResult)}`)
  }
  if (activationResult.error !== undefined) {
    throw new Error(`Expected activation error to be undefined, got ${JSON.stringify(activationResult.error)}`)
  }

  const textDocument = {
    languageId: 'reference-e2e',
    text: 'const value = 1',
    uri: 'file:///workspace/reference.reference-e2e',
  }
  const position = {
    columnIndex: 6,
    rowIndex: 0,
  }
  const providerResult = await Command.execute('Extensions.executeLanguageProvider', 'reference', 'provideReferences', textDocument, 6, position)
  const expected = {
    found: true,
    result: [
      {
        endColumnIndex: 10,
        endRowIndex: 0,
        offset: 6,
        startColumnIndex: 6,
        startRowIndex: 0,
        uri: textDocument.uri,
      },
    ],
  }
  if (JSON.stringify(providerResult) !== JSON.stringify(expected)) {
    throw new Error(`Expected isolated reference provider result ${JSON.stringify(expected)}, got ${JSON.stringify(providerResult)}`)
  }
}
