import { RendererWorker } from '@lvce-editor/rpc-registry'

export const readJson = (url: string): Promise<any> => {
  return RendererWorker.invoke('FileSystem.readJson', url)
}

export const statWithMetadata = (url: string): Promise<any> => {
  return RendererWorker.invoke('FileSystem.statWithMetadata', url)
}
