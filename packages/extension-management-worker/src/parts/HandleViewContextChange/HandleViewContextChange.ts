import { RendererWorker } from '@lvce-editor/rpc-registry'

export const handleViewContextChange = async (
  uid: number,
  viewId: string,
  context: Readonly<Record<string, boolean>>,
): Promise<void> => {
  await RendererWorker.invoke('ExtensionManagement.handleViewContextChange', uid, viewId, context)
}
