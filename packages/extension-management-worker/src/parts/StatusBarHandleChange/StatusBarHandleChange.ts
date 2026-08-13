import { RendererWorker } from '@lvce-editor/rpc-registry'
import * as StatusBarWorker from '../StatusBarWorker/StatusBarWorker.ts'

export const handleChange = async (_id: string): Promise<void> => {
  const statusBarVisible = await RendererWorker.invoke('Layout.getStatusBarVisible')
  if (!statusBarVisible) {
    return
  }
  await StatusBarWorker.invoke('StatusBar.handleChange')
}
