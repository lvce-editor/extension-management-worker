import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { AuthWorker } from '@lvce-editor/rpc-registry'
import { getAccessToken } from '../src/parts/GetAccessToken/GetAccessToken.ts'

const state: { authWorker: DisposableMockRpc | undefined } = {
  authWorker: undefined,
}

afterEach(() => {
  state.authWorker?.[Symbol.dispose]()
  state.authWorker = undefined
})

test('gets the access token from the auth worker', async () => {
  state.authWorker = AuthWorker.registerMockRpc({
    'Auth.getAccessToken': async () => 'token-1',
  })

  await expect(getAccessToken()).resolves.toBe('token-1')
  await expect(
    getAccessToken({
      refresh: 'if-needed',
    }),
  ).resolves.toBe('token-1')
  expect(state.authWorker.invocations).toEqual([
    ['Auth.getAccessToken', {}],
    ['Auth.getAccessToken', { refresh: 'if-needed' }],
  ])
})
