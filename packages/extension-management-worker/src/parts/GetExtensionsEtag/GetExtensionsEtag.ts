import { SharedProcess } from '@lvce-editor/rpc-registry'

export const getExtensionsEtag = async (): Promise<string> => {
  const etag = await SharedProcess.invoke('ExtensionManagement.getExtensionsEtag')
  return etag
}
