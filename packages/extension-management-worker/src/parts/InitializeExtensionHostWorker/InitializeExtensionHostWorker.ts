import { TransferMessagePortRpcParent } from '@lvce-editor/rpc'
import { ExtensionHost, RendererWorker } from '@lvce-editor/rpc-registry'
import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'

export const initializeExtensionHostWorker = async () => {
  const rpc = await TransferMessagePortRpcParent.create({
    commandMap: CommandMapRef.commandMapRef,
    async send(port) {
      await RendererWorker.sendMessagePortToExtensionHostWorker(port, 0)
    },
  })
  ExtensionHost.set(rpc)
}
