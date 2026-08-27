import { PlatformType } from '@lvce-editor/constants'
import { LazyTransferMessagePortRpcParent, type Rpc } from '@lvce-editor/rpc'
import { MainProcess, RendererWorker } from '@lvce-editor/rpc-registry'
import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'

export interface MainProcessDependencies {
  readonly createRpc: typeof LazyTransferMessagePortRpcParent.create
  readonly invokeRendererAndTransfer: typeof RendererWorker.invokeAndTransfer
  readonly setMainProcess: typeof MainProcess.set
}

const defaultDependencies: MainProcessDependencies = {
  createRpc: LazyTransferMessagePortRpcParent.create,
  invokeRendererAndTransfer: RendererWorker.invokeAndTransfer,
  setMainProcess: MainProcess.set,
}

const sendMessagePort = async (port: MessagePort, dependencies: MainProcessDependencies): Promise<void> => {
  await dependencies.invokeRendererAndTransfer(
    'SendMessagePortToMainProcess.sendMessagePortToMainProcess',
    port,
    'HandleElectronMessagePort.handleElectronMessagePort',
    0,
  )
}

export const initializeMainProcess = async (platform: number, dependencies: MainProcessDependencies = defaultDependencies): Promise<void> => {
  if (platform !== PlatformType.Electron) {
    return
  }
  const rpc: Rpc = await dependencies.createRpc({
    commandMap: CommandMapRef.commandMapRef,
    send(port) {
      return sendMessagePort(port, dependencies)
    },
  })
  dependencies.setMainProcess(rpc)
}
