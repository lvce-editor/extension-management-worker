import { RendererWorker } from '@lvce-editor/rpc-registry'

export const getExtension = async (id: string): Promise<any> => {
  // TODO
  const extension = await RendererWorker.getExtension(id)
  return extension
}
