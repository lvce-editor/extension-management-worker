import * as ExtensionHostSubWorkerUrl from '../ExtensionHostSubWorkerUrl/ExtensionHostSubWorkerUrl.ts'
import * as RendererWorkerIpcParentType from '../RendererWorkerIpcParentType/RendererWorkerIpcParentType.ts'
import * as ParentRpc from '../Rpc/Rpc.ts'

/**
 * @deprecated use createWebViewWorkerRpc2 which passes the worker url as a parameter
 */
export const createWebViewWorkerRpc = async (rpcInfo: any, port: MessagePort): Promise<void> => {
  // TODO this function is called from the iframe worker to create a direct
  // connection between a webview/iframe and it's webworker. For this to work
  // the iframe worker creates a messagechannel and sends one messageport to the webview
  // and the other messageport to the webworker. This enables direct communication via
  // the two message ports

  // TODO have a way so that the worker already includes the webview api and the extension
  // host subworker doesn't need to import the other file
  await ParentRpc.invokeAndTransfer('IpcParent.create', {
    method: RendererWorkerIpcParentType.ModuleWorkerAndWorkaroundForChromeDevtoolsBug,
    name: rpcInfo.name,
    port,
    raw: true,
    url: ExtensionHostSubWorkerUrl.extensionHostSubWorkerUrl,
  })
}
