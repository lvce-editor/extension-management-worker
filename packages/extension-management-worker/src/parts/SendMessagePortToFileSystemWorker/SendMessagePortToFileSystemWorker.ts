import { RendererWorker } from '@lvce-editor/rpc-registry'

export const sendMessagePortToFileSystemWorker = async (port: MessagePort): Promise<void> => {
  await RendererWorker.sendMessagePortToFileSystemWorker(port, 0)
}
