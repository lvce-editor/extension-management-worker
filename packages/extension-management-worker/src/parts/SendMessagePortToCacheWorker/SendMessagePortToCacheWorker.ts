import { CacheWorker } from '@lvce-editor/rpc-registry'

export const sendMessagePortToCacheWorker = async (extensionId: string, port: MessagePort): Promise<void> => {
  await CacheWorker.invokeAndTransfer('CacheWorker.handleExtensionMessagePort', port, extensionId)
}
