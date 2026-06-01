import { afterEach, expect, jest, test } from '@jest/globals'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const rpc = {
  invoke: jest.fn(),
}

afterEach(() => {
  jest.resetAllMocks()
  IsolatedExtensionHostWorkerState.clear()
})

jest.unstable_mockModule('@lvce-editor/rpc', () => {
  return {
    TransferMessagePortRpcParent: {
      create: jest.fn(async ({ send }) => {
        await send('port')
        return rpc
      }),
    },
  }
})

jest.unstable_mockModule('../src/parts/Rpc/Rpc.ts', () => {
  return {
    invokeAndTransfer: jest.fn(),
  }
})

const Rpc = await import('../src/parts/Rpc/Rpc.ts')
const GetOrCreateIsolatedExtensionHostWorker = await import(
  '../src/parts/GetOrCreateIsolatedExtensionHostWorker/GetOrCreateIsolatedExtensionHostWorker.ts'
)

test('getOrCreateIsolatedExtensionHostWorker launches extension main entry', async () => {
  await GetOrCreateIsolatedExtensionHostWorker.getOrCreateIsolatedExtensionHostWorker('sample.extension', '/remote/sample/main.js')

  expect(Rpc.invokeAndTransfer).toHaveBeenCalledTimes(1)
  expect(Rpc.invokeAndTransfer).toHaveBeenCalledWith(
    'LaunchIsolatedExtensionHostWorker.launchIsolatedExtensionHostWorker',
    'port',
    'sample.extension',
    '/remote/sample/main.js',
  )
})
