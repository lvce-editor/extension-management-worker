import { expect, test } from '@jest/globals'
import { commandMap } from '../src/parts/CommandMap/CommandMap.ts'
import { handleData } from '../src/parts/HandleData/HandleData.ts'

test('does nothing', () => {
  expect(handleData()).toBeUndefined()
})

test('is registered in the command map', () => {
  expect(commandMap['Extensions.handleData']).toBe(handleData)
})
