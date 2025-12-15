import { RendererWorker } from '@lvce-editor/rpc-registry'

export const set = async (url: string, contentSecurityPolicy: any) => {
  const pathName = new URL(url).pathname
  await RendererWorker.invoke('ExtensionHostWorkerContentSecurityPolicy.set', pathName, contentSecurityPolicy)
}
