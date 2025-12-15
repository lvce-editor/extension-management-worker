import * as WebSocketProtocol from '../WebSocketProtocol/WebSocketProtocol.ts'

export const getWebSocketUrl = (type: string, host: string): string => {
  const wsProtocol = WebSocketProtocol.getWebSocketProtocol()
  return `${wsProtocol}//${host}/websocket/${type}`
}
