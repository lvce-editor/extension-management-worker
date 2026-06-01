import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const getItems = async (rpc: any): Promise<readonly any[]> => {
  return rpc.invoke('ExtensionApi.getStatusBarItems')
}

export const getStatusBarItems = async (): Promise<readonly any[]> => {
  const rpcs = IsolatedExtensionHostWorkerState.getAll()
  const results = await Promise.all(rpcs.map(getItems))
  return results.flat()
}
