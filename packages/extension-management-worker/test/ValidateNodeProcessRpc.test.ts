import { afterEach, expect, test } from '@jest/globals'
import * as DeclaredRpcState from '../src/parts/DeclaredRpcState/DeclaredRpcState.ts'
import { validateNodeProcessRpc } from '../src/parts/ValidateNodeProcessRpc/ValidateNodeProcessRpc.ts'

afterEach(() => {
  DeclaredRpcState.clear()
})

test('accepts a node process declared by the calling extension', () => {
  DeclaredRpcState.set({
    id: 'third-party.extension',
    path: '/extensions/third-party',
    rpc: [{ id: 'client', type: 'node-process', url: 'client.js' }],
  })

  expect(() => validateNodeProcessRpc('third-party.extension', 'client')).not.toThrow()
})

test('rejects an undeclared node process', () => {
  DeclaredRpcState.set({ id: 'sample.extension', path: '/extensions/sample', rpc: [] })

  expect(() => validateNodeProcessRpc('sample.extension', 'missing')).toThrow('Node rpc missing is not declared by extension sample.extension')
})

test('rejects an rpc declared by another extension identity', () => {
  DeclaredRpcState.set({
    id: 'other.extension',
    rpc: [{ id: 'client', type: 'node-process', url: 'client.js' }],
  })
  DeclaredRpcState.set({ id: 'sample.extension', rpc: [] })

  expect(() => validateNodeProcessRpc('sample.extension', 'client')).toThrow('Node rpc client is not declared by extension sample.extension')
})

test.each(['node', 'web-worker'])('rejects unsupported rpc type %s', (type) => {
  DeclaredRpcState.set({
    id: 'sample.extension',
    rpc: [{ id: 'client', type, url: 'client.js' }],
  })

  expect(() => validateNodeProcessRpc('sample.extension', 'client')).toThrow(
    'Rpc client declared by extension sample.extension is not a node process',
  )
})
