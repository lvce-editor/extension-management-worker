import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'activate-by-event'

export const skip = 1

export const test: Test = async ({ Command }) => {
  const result = await Command.execute('Extensions.activateByEvent', 'onCommand:test', '', 2)

  if (result.hasActivatedExtensions !== false) {
    throw new Error('Expected no extensions to be activated')
  }
  if (result.error !== undefined) {
    throw new Error('Expected activation error to be undefined')
  }
}
