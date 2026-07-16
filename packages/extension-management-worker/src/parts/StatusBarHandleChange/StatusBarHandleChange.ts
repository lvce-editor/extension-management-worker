import { RendererWorker } from '@lvce-editor/rpc-registry'

export const handleChange = async (_id: string): Promise<void> => {
  const statusBarVisible = await RendererWorker.invoke('Layout.getStatusBarVisible')
  if (!statusBarVisible) {
    return
  }
  await RendererWorker.invoke('StatusBar.handleItemsChanged')
}
