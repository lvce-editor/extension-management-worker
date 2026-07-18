import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'reference-provider.isolated'

export const test: Test = async ({ Extension }) => {
  const edits = await Extension.executeFormattingProvider({
    languageId: 'reference-e2e-driver',
    text: '',
  })
  const { activationResult, providerResult } = JSON.parse(edits[0].inserted)
  if (activationResult.hasActivatedExtensions !== true) {
    throw new Error(`Expected reference extension to be activated, got ${JSON.stringify(activationResult)}`)
  }
  if (activationResult.error !== undefined) {
    throw new Error(`Expected activation error to be undefined, got ${JSON.stringify(activationResult.error)}`)
  }
  const expected = {
    found: true,
    result: [
      {
        endColumnIndex: 10,
        endRowIndex: 0,
        offset: 6,
        startColumnIndex: 6,
        startRowIndex: 0,
        uri: 'file:///workspace/reference.reference-e2e',
      },
    ],
  }
  if (JSON.stringify(providerResult) !== JSON.stringify(expected)) {
    throw new Error(`Expected isolated reference provider result ${JSON.stringify(expected)}, got ${JSON.stringify(providerResult)}`)
  }
}
