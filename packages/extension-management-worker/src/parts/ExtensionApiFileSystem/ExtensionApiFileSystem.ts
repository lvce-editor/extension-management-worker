import { RendererWorker } from '@lvce-editor/rpc-registry'

export const readFile = async (uri: string): Promise<string> => {
  return RendererWorker.invoke('FileSystem.readFile', uri)
}
