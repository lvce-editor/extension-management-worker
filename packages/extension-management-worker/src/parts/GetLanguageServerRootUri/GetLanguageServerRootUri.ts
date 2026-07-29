import { RendererWorker } from '@lvce-editor/rpc-registry'

export const getLanguageServerRootUri = async (): Promise<string | undefined> => {
  try {
    const workspacePath = await RendererWorker.invoke('Workspace.getPath')
    return typeof workspacePath === 'string' && workspacePath ? workspacePath : undefined
  } catch {
    return undefined
  }
}
