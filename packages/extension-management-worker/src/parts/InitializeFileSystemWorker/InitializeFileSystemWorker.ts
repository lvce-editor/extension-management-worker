import { TransferMessagePortRpcParent } from '@lvce-editor/rpc'
import { FileSystemWorker, RendererWorker } from '@lvce-editor/rpc-registry'
import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'

export const initializeFileSystemWorker = async () => {
  const rpc = await TransferMessagePortRpcParent.create({
    commandMap: CommandMapRef.commandMapRef,
    async send(port) {
      await RendererWorker.sendMessagePortToFileSystemWorker(port, 0)
    },
  })
  FileSystemWorker.set(rpc)
}
