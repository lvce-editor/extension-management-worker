import { RendererWorker } from '@lvce-editor/rpc-registry'

export const sendMessagePortToElectron = async (port: MessagePort, initialCommand: string): Promise<void> => {
  await RendererWorker.invokeAndTransfer('SendMessagePortToElectron.sendMessagePortToElectron', port, initialCommand)
}
