import { RendererWorker } from '@lvce-editor/rpc-registry'
import { getWorkspaceProgressData } from '../GetWorkspaceProgressData/GetWorkspaceProgressData.ts'

export const handleChange = async (operationId?: number): Promise<void> => {
  if (!Number.isSafeInteger(operationId)) return
  try {
    const data = await getWorkspaceProgressData()
    await RendererWorker.invoke('Workspace.handleExtensionProgressChange', operationId, data)
  } catch {
    // Workspace progress is optional and the renderer may be closing.
  }
}
