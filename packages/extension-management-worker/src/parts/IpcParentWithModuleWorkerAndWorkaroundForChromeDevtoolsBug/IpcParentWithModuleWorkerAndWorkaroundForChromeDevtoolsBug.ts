/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import * as Assert from '@lvce-editor/assert'
import { MessagePortRpcParent, type Rpc } from '@lvce-editor/rpc'
import * as GetPortTuple from '../GetPortTuple/GetPortTuple.ts'
import * as RendererWorkerIpcParentType from '../RendererWorkerIpcParentType/RendererWorkerIpcParentType.ts'
import * as ParentRpc from '../Rpc/Rpc.ts'

const sendPort = async ({ name, port, url }: { url: string; name: string; port: MessagePort }): Promise<void> => {
  await ParentRpc.invokeAndTransfer('IpcParent.create', {
    method: RendererWorkerIpcParentType.ModuleWorkerAndWorkaroundForChromeDevtoolsBug,
    name,
    port,
    raw: true,
    url,
  })
}

export const create = async ({ commandMap, name, url }: { url: string; name: string; commandMap: any }): Promise<Rpc> => {
  Assert.string(url)
  Assert.string(name)
  const { port1, port2 } = GetPortTuple.getPortTuple()
  const rpcPromise = MessagePortRpcParent.create({
    commandMap,
    isMessagePortOpen: true,
    messagePort: port2,
  })
  // TODO rpc module should start port
  port2.start()
  await sendPort({ name, port: port1, url })
  const rpc = await rpcPromise
  return rpc
}
