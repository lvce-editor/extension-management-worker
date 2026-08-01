import { afterEach, expect, test } from '@jest/globals'
import { createExtensionCommandExecutor, createExtensionCommandMap } from '../src/parts/CreateExtensionCommandMap/CreateExtensionCommandMap.ts'
import * as DeclaredRpcState from '../src/parts/DeclaredRpcState/DeclaredRpcState.ts'
import * as FileChangeHandlerRegistry from '../src/parts/FileChangeHandlerRegistry/FileChangeHandlerRegistry.ts'

afterEach(() => {
  DeclaredRpcState.clear()
  FileChangeHandlerRegistry.reset()
})

test('does not expose resolved node paths to extensions', async () => {
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
  const commandMap = createExtensionCommandMap('extension-one')

  expect(commandMap['Extensions.createNodeRpcConnection']).toEqual(expect.any(Function))
  expect(commandMap['Extensions.createNodeRpcMessagePort']).toEqual(expect.any(Function))
  expect(commandMap['Extensions.getNodeRpcInfo']).toBeUndefined()
})

test('cannot request an rpc declared by another extension identity', async () => {
  DeclaredRpcState.set({
    builtin: true,
    id: 'extension-one',
    path: '/extensions/one',
    rpc: [{ id: 'one-client', name: 'One', type: 'node', url: 'client.js' }],
  })
  DeclaredRpcState.set({
    builtin: true,
    id: 'extension-two',
    path: '/extensions/two',
    rpc: [{ id: 'two-client', name: 'Two', type: 'node', url: 'client.js' }],
  })
  const commandMap = createExtensionCommandMap('extension-one')

  await expect(commandMap['Extensions.createNodeRpcConnection']('two-client')).rejects.toThrow(
    'Node rpc two-client is not declared by extension extension-one',
  )
})

test('createExtensionCommandExecutor rejects unknown commands', () => {
  const execute = createExtensionCommandExecutor({})

  expect(() => execute('Extensions.missing')).toThrow('Command not found Extensions.missing')
})

test('secret storage commands are bound to the calling extension', () => {
  const commandMap = createExtensionCommandMap('sample.extension')

  expect(commandMap).toEqual(
    expect.objectContaining({
      'Extensions.deleteSecret': expect.any(Function),
      'Extensions.getSecret': expect.any(Function),
      'Extensions.storeSecret': expect.any(Function),
    }),
  )
})

test('file change registrations are bound to the calling extension', () => {
  const firstCommandMap = createExtensionCommandMap('extension-one')
  const secondCommandMap = createExtensionCommandMap('extension-two')

  firstCommandMap['Extensions.registerFileChangeHandler']()
  secondCommandMap['Extensions.registerFileChangeHandler']()
  expect(FileChangeHandlerRegistry.getRegisteredExtensionIds()).toEqual(['extension-one', 'extension-two'])

  firstCommandMap['Extensions.unregisterFileChangeHandler']()
  expect(FileChangeHandlerRegistry.getRegisteredExtensionIds()).toEqual(['extension-two'])
})

test.each(['ExtensionNodeRpc.create', 'FileSystem.readFile', 'WebSocketCapability.create', 'SendMessagePortToElectron.sendMessagePortToElectron'])(
  'rejects privileged renderer command %s',
  (command) => {
    const commandMap = createExtensionCommandMap('sample.extension')

    expect(() => commandMap['Extensions.executeCommand'](command)).toThrow(`cannot execute privileged command ${command}`)
  },
)

test('rejects arbitrary Electron port targets', () => {
  const commandMap = createExtensionCommandMap('sample.extension')
  const { port1, port2 } = new MessageChannel()

  expect(() =>
    commandMap['Extensions.sendMessagePortToElectron'](port1, 'HandleMessagePortForFileSystemProcess.handleMessagePortForFileSystemProcess'),
  ).toThrow('cannot send a port')
  port1.close()
  port2.close()
})
