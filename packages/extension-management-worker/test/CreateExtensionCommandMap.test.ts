import { afterEach, expect, test } from '@jest/globals'
import { createExtensionCommandMap } from '../src/parts/CreateExtensionCommandMap/CreateExtensionCommandMap.ts'
import * as DeclaredRpcState from '../src/parts/DeclaredRpcState/DeclaredRpcState.ts'

afterEach(() => {
  DeclaredRpcState.clear()
})

test('scopes declared rpc lookup to the calling extension', async () => {
  DeclaredRpcState.set({
    id: 'extension-one',
    path: '/extensions/one',
    rpc: [{ id: 'client', name: 'One', type: 'node', url: 'client.js' }],
  })
  DeclaredRpcState.set({
    id: 'extension-two',
    path: '/extensions/two',
    rpc: [{ id: 'client', name: 'Two', type: 'node', url: 'client.js' }],
  })
  const firstCommandMap = createExtensionCommandMap('extension-one')
  const secondCommandMap = createExtensionCommandMap('extension-two')
  const getFirstNodeRpcInfo = firstCommandMap['Extensions.getNodeRpcInfo'] as (id: string) => Promise<unknown>
  const getSecondNodeRpcInfo = secondCommandMap['Extensions.getNodeRpcInfo'] as (id: string) => Promise<unknown>

  await expect(getFirstNodeRpcInfo('client')).resolves.toEqual({ name: 'One', path: '/extensions/one/client.js' })
  await expect(getSecondNodeRpcInfo('client')).resolves.toEqual({ name: 'Two', path: '/extensions/two/client.js' })
})
