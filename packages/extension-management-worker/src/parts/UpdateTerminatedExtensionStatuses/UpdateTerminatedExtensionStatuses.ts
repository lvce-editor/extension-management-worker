import type { Rpc } from '@lvce-editor/rpc'
import type { RuntimeStatus } from '../RuntimeStatus/RuntimeStatus.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'
import * as RuntimeStatusType from '../RuntimeStatusType/RuntimeStatusType.ts'
import * as Timeout from '../Timeout/Timeout.ts'

type GetRpc = (extensionId: string) => Rpc | undefined
type Sleep = (milliseconds: number) => Promise<void>

const invokePing = async (rpc: Rpc): Promise<boolean> => {
  try {
    await rpc.invoke('ExtensionApi.ping')
  } catch {
    // Any response proves that the worker is still alive.
  }
  return true
}

const waitForTimeout = async (timeout: number, sleep: Sleep): Promise<boolean> => {
  await sleep(timeout)
  return false
}

const isResponsive = async (rpc: Rpc, timeout: number, sleep: Sleep): Promise<boolean> => {
  return Promise.race([invokePing(rpc), waitForTimeout(timeout, sleep)])
}

export const updateTerminatedExtensionStatuses = async (
  runtimeStatuses: Readonly<Record<string, RuntimeStatus>>,
  getRpc: GetRpc = IsolatedExtensionHostWorkerState.get,
  timeout = 250,
  sleep: Sleep = Timeout.sleep,
): Promise<void> => {
  const activatedStatuses = Object.values(runtimeStatuses).filter((status) => status.status === RuntimeStatusType.Activated)
  await Promise.all(
    activatedStatuses.map(async (status) => {
      const rpc = getRpc(status.id)
      if (!rpc || (await isResponsive(rpc, timeout, sleep))) {
        return
      }
      ExtensionsState.updateRuntimeStatus(status.id, {
        error: 'Extension worker stopped responding',
        status: RuntimeStatusType.Terminated,
      })
    }),
  )
}
