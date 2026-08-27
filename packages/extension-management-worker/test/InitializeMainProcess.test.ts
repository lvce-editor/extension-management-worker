import type { Rpc } from '@lvce-editor/rpc'
import { expect, jest, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import type { MainProcessDependencies } from '../src/parts/InitializeMainProcess/InitializeMainProcess.ts'
import { initializeMainProcess } from '../src/parts/InitializeMainProcess/InitializeMainProcess.ts'

const createDependencies = (): MainProcessDependencies => {
  const rpc: Rpc = {
    dispose: jest.fn(async () => undefined),
    invoke: jest.fn(async () => undefined),
    invokeAndTransfer: jest.fn(async () => undefined),
    send: jest.fn(),
  }
  return {
    createRpc: jest.fn(async (options: Readonly<{ readonly send: (port: MessagePort) => Promise<void> }>) => {
      const { port1 } = new MessageChannel()
      await options.send(port1)
      return rpc
    }),
    invokeRendererAndTransfer: jest.fn(async () => undefined),
    setMainProcess: jest.fn(),
  }
}

test('initializeMainProcess creates a direct Electron main-process rpc', async () => {
  const dependencies = createDependencies()

  await initializeMainProcess(PlatformType.Electron, dependencies)

  expect(dependencies.invokeRendererAndTransfer).toHaveBeenCalledWith(
    'SendMessagePortToMainProcess.sendMessagePortToMainProcess',
    expect.anything(),
    'HandleElectronMessagePort.handleElectronMessagePort',
    0,
  )
  expect(dependencies.setMainProcess).toHaveBeenCalledTimes(1)
})

test('initializeMainProcess does nothing outside Electron', async () => {
  const dependencies = createDependencies()

  await initializeMainProcess(PlatformType.Web, dependencies)

  expect(dependencies.createRpc).not.toHaveBeenCalled()
  expect(dependencies.setMainProcess).not.toHaveBeenCalled()
})
