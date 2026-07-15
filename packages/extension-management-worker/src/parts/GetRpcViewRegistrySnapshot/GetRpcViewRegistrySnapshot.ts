import type { Rpc } from '@lvce-editor/rpc'
import type { ViewRegistrySnapshot } from '../GetViewsTypes/GetViewsTypes.ts'

export const getRpcViewRegistrySnapshot = async (rpc: Rpc): Promise<ViewRegistrySnapshot> => {
  return rpc.invoke('ExtensionApi.getViewRegistrySnapshot')
}
