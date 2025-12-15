import type { Rpc } from '@lvce-editor/rpc'
import { VError } from '@lvce-editor/verror'
import * as IpcParentModule from '../IpcParentModule/IpcParentModule.ts'

export const create = async ({ method, ...options }: any): Promise<Rpc> => {
  try {
    const module = IpcParentModule.getModule(method)
    // @ts-ignore
    const rpc = await module.create(options)
    return rpc
  } catch (error) {
    throw new VError(error, `Failed to create rpc`)
  }
}
