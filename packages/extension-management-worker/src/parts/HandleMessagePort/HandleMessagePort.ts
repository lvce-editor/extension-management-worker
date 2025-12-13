import { PlainMessagePortRpc } from '@lvce-editor/rpc'
import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'

export const handleMessagePort = async (port: MessagePort): Promise<void> => {
  await PlainMessagePortRpc.create({
    commandMap: CommandMapRef.commandMapRef,
    messagePort: port,
  })
}
