import { beforeEach, expect, test } from '@jest/globals'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'

beforeEach(() => {
  ExtensionsState.reset()
})

test('update returns new immutable state object', () => {
  const initialState = ExtensionsState.get()

  ExtensionsState.update({
    disabledIds: ['sample.extension'],
  })

  const nextState = ExtensionsState.get()

  expect(nextState).toEqual({
    activatedExtensions: Object.create(null),
    cachedActivationEvents: Object.create(null),
    cachedExtensions: undefined,
    disabledIds: ['sample.extension'],
    platform: 0,
    runtimeStatuses: Object.create(null),
    webExtensions: [],
  })
  expect(nextState).not.toBe(initialState)
  expect(initialState.disabledIds).toEqual([])
})

test('setWebExtensions keeps previous snapshots unchanged', () => {
  const initialState = ExtensionsState.get()

  ExtensionsState.setWebExtensions([{ uri: 'https://example.com/one' }])

  const nextState = ExtensionsState.get()

  expect(nextState.webExtensions).toEqual([{ uri: 'https://example.com/one' }])
  expect(nextState.webExtensions).not.toBe(initialState.webExtensions)
  expect(initialState.webExtensions).toEqual([])
})
