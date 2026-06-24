import { expect, test } from '@jest/globals'

test('array spread - adds items to empty array', () => {
  const initialItems: readonly string[] = []
  const items = [...initialItems, 'item']

  expect(items).toEqual(['item'])
})
