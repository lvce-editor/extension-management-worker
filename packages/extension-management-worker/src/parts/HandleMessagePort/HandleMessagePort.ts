import { PlainMessagePortRpc } from '@lvce-editor/rpc'
import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'
import * as RpcId from '../RpcId/RpcId.ts'
import * as StatusBarWorker from '../StatusBarWorker/StatusBarWorker.ts'

export const handleMessagePort = async (port: MessagePort, rpcId: number): Promise<void> => {
  const rpc = await PlainMessagePortRpc.create({
    commandMap: CommandMapRef.commandMapRef,
    messagePort: port,
  })
  if (rpcId === RpcId.StatusBarWorker) {
    StatusBarWorker.set(rpc)
  }
}
