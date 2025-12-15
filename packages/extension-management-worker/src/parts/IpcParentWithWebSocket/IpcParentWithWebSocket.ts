import * as Assert from '@lvce-editor/assert'
import { type Rpc, WebSocketRpcParent } from '@lvce-editor/rpc'
import * as GetWebSocketUrl from '../GetWebSocketUrl/GetWebSocketUrl.ts'

export const create = async ({ type }: any): Promise<Rpc> => {
  Assert.string(type)
  const wsUrl = GetWebSocketUrl.getWebSocketUrl(type, location.host)
  const webSocket = new WebSocket(wsUrl)
  const rpc = await WebSocketRpcParent.create({
    commandMap: {},
    webSocket,
  })
  return rpc
}
