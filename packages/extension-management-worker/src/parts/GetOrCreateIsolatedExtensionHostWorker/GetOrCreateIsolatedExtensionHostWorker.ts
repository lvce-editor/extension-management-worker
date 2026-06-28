import { TransferMessagePortRpcParent, type Rpc } from '@lvce-editor/rpc'
import * as CancelToken from '../CancelToken/CancelToken.ts'
import * as CommandMapRef from '../CommandMapRef/CommandMapRef.ts'
import * as IsolatedExtensionHostWorkerState from '../IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'
import * as RendererWorker from '../Rpc/Rpc.ts'
import * as Timeout from '../Timeout/Timeout.ts'

type CreateRpc = (options: {
  readonly commandMap: any
  readonly isMessagePortOpen: boolean
  readonly send: (port: MessagePort) => Promise<void>
}) => Promise<Rpc>

type InvokeAndTransfer = typeof RendererWorker.invokeAndTransfer

const rpcConnectionTimeout = 15_000

const rejectAfterTimeout = async (timeout: number, token: any): Promise<never> => {
  await Timeout.sleep(timeout)
  if (CancelToken.isCanceled(token)) {
    return new Promise<never>(() => {})
  }
  throw new Error(`Setting up rpc connection failed after ${timeout}ms, likely due to missing activation call`)
}

export const createIsolatedExtensionHostWorker = async (
  extensionId: string,
  absolutePath: string,
  createRpc: CreateRpc,
  invokeAndTransfer: InvokeAndTransfer,
  timeout: number = rpcConnectionTimeout,
): Promise<Rpc> => {
  const token = CancelToken.create()
  try {
    return await Promise.race([
      createRpc({
        commandMap: CommandMapRef.commandMapRef,
        isMessagePortOpen: true,
        send(port: MessagePort) {
          return invokeAndTransfer('LaunchIsolatedExtensionHostWorker.launchIsolatedExtensionHostWorker', port, extensionId, absolutePath)
        },
      }),
      rejectAfterTimeout(timeout, token),
    ])
  } finally {
    CancelToken.cancel(token)
  }
}

export const getOrCreateIsolatedExtensionHostWorker = async (extensionId: string, absolutePath: string): Promise<Rpc> => {
  const existingRpc = IsolatedExtensionHostWorkerState.get(extensionId)
  if (existingRpc) {
    return existingRpc
  }
  const rpc = await createIsolatedExtensionHostWorker(
    extensionId,
    absolutePath,
    TransferMessagePortRpcParent.create,
    RendererWorker.invokeAndTransfer,
  )
  IsolatedExtensionHostWorkerState.set(extensionId, rpc)
  return rpc
}
