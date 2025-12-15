import * as Assert from '@lvce-editor/assert'
import * as ExtensionHostSubWorkerUrl from '../ExtensionHostSubWorkerUrl/ExtensionHostSubWorkerUrl.ts'
import * as ExtensionHostWorkerContentSecurityPolicy from '../ExtensionHostWorkerContentSecurityPolicy/ExtensionHostWorkerContentSecurityPolicy.ts'
import * as IpcParent from '../IpcParent/IpcParent.ts'
import * as IpcParentType from '../IpcParentType/IpcParentType.ts'

/**
 *
 * @deprecated
 */
export const createLegacyRpc = async ({ commandMap = {}, contentSecurityPolicy, execute, name, url }: any) => {
  Assert.string(url)
  Assert.string(name)
  Assert.object(commandMap)
  if (contentSecurityPolicy) {
    await ExtensionHostWorkerContentSecurityPolicy.set(url, contentSecurityPolicy)
  }
  const rpc = await IpcParent.create({
    commandMap,
    method: IpcParentType.ModuleWorkerAndWorkaroundForChromeDevtoolsBug,
    name,
    url: ExtensionHostSubWorkerUrl.extensionHostSubWorkerUrl,
  })
  if (execute) {
    // deprecated
    // @ts-ignore
    rpc.ipc.execute = execute
  }
  await rpc.invoke('LoadFile.loadFile', url)
  return rpc
}
