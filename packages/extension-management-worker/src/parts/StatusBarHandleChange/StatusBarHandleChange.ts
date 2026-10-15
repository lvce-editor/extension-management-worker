import { RendererWorker } from '@lvce-editor/rpc-registry'
import * as StatusBarWorker from '../StatusBarWorker/StatusBarWorker.ts'

export const handleChange = async (_id: string, applicationId?: string): Promise<void> => {
  if (applicationId !== undefined) {
    const visible = await RendererWorker.invoke('Application.execute', applicationId, 'Layout.getStatusBarVisible')
    if (visible) {
      await RendererWorker.invoke('Application.execute', applicationId, 'StatusBar.handleChange')
    }
    return
  }
  const statusBarVisible = await RendererWorker.invoke('Layout.getStatusBarVisible')
  if (!statusBarVisible) {
    return
  }
  await StatusBarWorker.invoke('StatusBar.handleChange')
}
