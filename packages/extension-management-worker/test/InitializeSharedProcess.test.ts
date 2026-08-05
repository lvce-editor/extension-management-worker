import { expect, jest, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import type { SharedProcessDependencies } from '../src/parts/InitializeSharedProcess/InitializeSharedProcess.ts'
import { initializeSharedProcess } from '../src/parts/InitializeSharedProcess/InitializeSharedProcess.ts'

const directRpc = { invoke: jest.fn() }
const electronRpc = { invoke: jest.fn() }
const legacyRpc = { invoke: jest.fn() }
const mockWebSocket = {} as WebSocket

const createDependencies = (): SharedProcessDependencies => {
  return {
    createLegacyWebSocketRpc: jest.fn(() => legacyRpc) as never,
    createTransferMessagePortRpc: jest.fn(() => electronRpc) as never,
    createWebSocket: jest.fn(() => mockWebSocket),
    createWebSocketRpc: jest.fn(() => directRpc) as never,
    invokeRenderer: jest.fn(async () => ({ protocols: ['lvce-rpc', 'lvce-capability.token'], url: 'ws://localhost/websocket/capability' })),
    sendMessagePortToSharedProcess: jest.fn(async () => {}),
    setSharedProcess: jest.fn(),
  }
}

test('initializes a direct capability connection on Remote', async () => {
  const dependencies = createDependencies()
  await initializeSharedProcess(PlatformType.Remote, dependencies)

  expect(dependencies.invokeRenderer).toHaveBeenCalledWith('WebSocketCapability.create', 'shared-process')
  expect(dependencies.createWebSocket).toHaveBeenCalledWith('ws://localhost/websocket/capability', ['lvce-rpc', 'lvce-capability.token'])
  expect(jest.mocked(dependencies.setSharedProcess).mock.calls[0][0] as unknown).toBe(directRpc)
})

test('falls back only when an older renderer lacks capability creation', async () => {
  const dependencies = createDependencies()
  jest.mocked(dependencies.invokeRenderer).mockRejectedValue(new Error('Command not found WebSocketCapability.create'))

  await initializeSharedProcess(PlatformType.Remote, dependencies)

  expect(dependencies.createLegacyWebSocketRpc).toHaveBeenCalledWith({ commandMap: {}, type: 'shared-process' })
  expect(jest.mocked(dependencies.setSharedProcess).mock.calls[0][0] as unknown).toBe(legacyRpc)
})

test('falls back when an older renderer has no capability module', async () => {
  const dependencies = createDependencies()
  jest.mocked(dependencies.invokeRenderer).mockRejectedValue(new Error('module WebSocketCapability not found'))

  await initializeSharedProcess(PlatformType.Remote, dependencies)

  expect(dependencies.createLegacyWebSocketRpc).toHaveBeenCalledWith({ commandMap: {}, type: 'shared-process' })
})

test('does not downgrade other capability errors', async () => {
  const dependencies = createDependencies()
  jest.mocked(dependencies.invokeRenderer).mockRejectedValue(new Error('issuer rejected'))

  await expect(initializeSharedProcess(PlatformType.Remote, dependencies)).rejects.toThrow('issuer rejected')
  expect(dependencies.createLegacyWebSocketRpc).not.toHaveBeenCalled()
})

test.each([new Error('WebSocketCapability.create unauthorized'), 'renderer unavailable'])(
  'does not downgrade rejected capability request %p',
  async (error) => {
    const dependencies = createDependencies()
    jest.mocked(dependencies.invokeRenderer).mockRejectedValue(error)

    await expect(initializeSharedProcess(PlatformType.Remote, dependencies)).rejects.toBe(error)
    expect(dependencies.createLegacyWebSocketRpc).not.toHaveBeenCalled()
  },
)

test('initializes and transfers the Electron shared process port', async () => {
  const dependencies = createDependencies()
  await initializeSharedProcess(PlatformType.Electron, dependencies)

  expect(jest.mocked(dependencies.setSharedProcess).mock.calls[0][0] as unknown).toBe(electronRpc)
  const options = jest.mocked(dependencies.createTransferMessagePortRpc).mock.calls[0][0]
  const { port1, port2 } = new MessageChannel()
  await options.send(port1)
  expect(dependencies.sendMessagePortToSharedProcess).toHaveBeenCalledWith(port1)
  port2.close()
})

test('does not initialize a shared process on Web', async () => {
  const dependencies = createDependencies()
  await initializeSharedProcess(PlatformType.Web, dependencies)

  expect(dependencies.setSharedProcess).not.toHaveBeenCalled()
})
