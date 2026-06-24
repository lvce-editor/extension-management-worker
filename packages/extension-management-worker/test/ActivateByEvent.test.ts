import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { SharedProcess } from '@lvce-editor/rpc-registry'
import { activateByEvent } from '../src/parts/ActivateByEvent/ActivateByEvent.ts'

const state: {
  sharedProcess: DisposableMockRpc | undefined
} = {
  sharedProcess: undefined,
}

afterEach(() => {
  state.sharedProcess?.[Symbol.dispose]()
  state.sharedProcess = undefined
})

test('activateByEvent returns hasActivatedExtensions false when no extensions match', async () => {
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [
        {
          activation: ['onCommand:other'],
          id: 'sample.extension-one',
          isolated: true,
        },
      ]
    },
  })

  const result = await activateByEvent('onCommand:test', '', 2)

  expect(result).toEqual({
    error: undefined,
    hasActivatedExtensions: false,
  })
})

test('activateByEvent returns error when getAllExtensions fails', async () => {
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      throw new Error('Failed to get extensions')
    },
  })

  const result = await activateByEvent('onCommand:test', '', 2)

  expect(result.hasActivatedExtensions).toBe(false)
  expect(result.error).toBeInstanceOf(Error)
  expect(result.error!.message).toBe('Failed to get extensions')
})

test('activateByEvent returns hasActivatedExtensions false when event is none and no extensions are activating', async () => {
  const result = await activateByEvent('none', '', 1)

  expect(result).toEqual({
    error: undefined,
    hasActivatedExtensions: false,
  })
})

test('activateByEvent catches error from activateExtension3 and returns it in result', async () => {
  state.sharedProcess = SharedProcess.registerMockRpc({
    'ExtensionManagement.getAllExtensions'() {
      return [
        {
          activation: ['onCommand:test'],
          id: 'sample.extension-one',
          isolated: true,
        },
      ]
    },
  })

  const result = await activateByEvent('onCommand:test', '', 2)

  expect(result.hasActivatedExtensions).toBe(false)
  expect(result.error).toBeInstanceOf(Error)
})
