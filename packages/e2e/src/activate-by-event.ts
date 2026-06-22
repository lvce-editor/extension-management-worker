import { expect } from '@playwright/test'
import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'activate-by-event'

export const skip = 1

export const test: Test = async ({ Command }) => {
  const result = await Command.execute('Extensions.activateByEvent', 'onCommand:test', '', 2)

  expect(result).toHaveProperty('hasActivatedExtensions')
  expect(result).toHaveProperty('error')
  expect(result.hasActivatedExtensions).toBe(false)
  expect(result.error).toBeUndefined()
}
