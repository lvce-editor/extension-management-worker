import { afterEach, expect, test } from '@jest/globals'
import { createMockRpc } from '@lvce-editor/rpc'
import { ErrorWorker } from '@lvce-editor/rpc-registry'
import { handleUncaughtExtensionError } from '../src/parts/HandleUncaughtExtensionError/HandleUncaughtExtensionError.ts'

afterEach(() => {
  ErrorWorker.set(createMockRpc({ commandMap: {} }))
})

test('prettifies and prints an uncaught extension error', async () => {
  const invocations: unknown[][] = []
  const error = {
    constructor: {
      name: 'TypeError',
    },
    message: 'x is not a function',
    stack: 'TypeError: x is not a function\n    at activate (extension.js:2:3)',
  }
  const prettyError = {
    codeFrame: '> 2 | activate()',
    message: 'TypeError: x is not a function',
    stack: '    at activate (extension.js:2:3)',
    type: 'TypeError',
  }
  ErrorWorker.set(
    createMockRpc({
      commandMap: {
        async 'Errors.prepare'(value: unknown): Promise<unknown> {
          invocations.push(['Errors.prepare', value])
          return prettyError
        },
        async 'Errors.print'(value: unknown, prefix: string): Promise<void> {
          invocations.push(['Errors.print', value, prefix])
        },
      },
    }),
  )

  await handleUncaughtExtensionError(error)

  expect(invocations).toEqual([
    ['Errors.prepare', error],
    ['Errors.print', prettyError, '[Extension] Uncaught Error: '],
  ])
})
