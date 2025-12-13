import { RendererWorker } from '@lvce-editor/rpc-registry'

export const invalidateExtensionsCache = async () => {
  await RendererWorker.invoke('ExtensionManagement.invalidateExtensionsCache')
}
