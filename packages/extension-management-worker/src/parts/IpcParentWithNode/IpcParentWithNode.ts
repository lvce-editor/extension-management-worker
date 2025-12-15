import { PlatformType } from '@lvce-editor/constants'
import * as IpcParentWithElectronMessagePort from '../IpcParentWithElectronMessagePort/IpcParentWithElectronMessagePort.ts'
import * as IpcParentWithWebSocket from '../IpcParentWithWebSocket/IpcParentWithWebSocket.ts'

const getModule = (platform: number) => {
  switch (platform) {
    case PlatformType.Remote:
      return IpcParentWithWebSocket
    default:
      return IpcParentWithElectronMessagePort
  }
}

export const create = async ({ platform, raw, type }: any) => {
  const module = getModule(platform)
  const rpc = await module.create({ type })
  return rpc
}
