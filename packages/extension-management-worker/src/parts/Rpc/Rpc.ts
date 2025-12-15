/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { RendererWorker } from '@lvce-editor/rpc-registry'

export const invoke = (method: string, ...params: any[]): Promise<any> => {
  return RendererWorker.invoke(method, ...params)
}

export const invokeAndTransfer = (method: string, ...params: any[]): Promise<any> => {
  return RendererWorker.invokeAndTransfer(method, ...params)
}
