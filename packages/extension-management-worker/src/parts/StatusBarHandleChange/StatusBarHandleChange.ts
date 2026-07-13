import { RendererWorker } from '@lvce-editor/rpc-registry'

export const handleChange = async (_id: string): Promise<void> => {
  await RendererWorker.invoke('StatusBar.handleItemsChanged')
}
