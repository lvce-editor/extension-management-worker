/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import * as ExtensionHostSubWorkerUrl from '../ExtensionHostSubWorkerUrl/ExtensionHostSubWorkerUrl.ts'
import { getContentSecurityPolicy } from '../GetContentSecurityPolicy/GetContentSecurityPolicy.ts'
import * as RendererWorker from '../Rpc/Rpc.ts'

export const createExtensionWorkerScope = (extensionId: string) => {
  const children = new Set<string>()
  let disposed = false

  const createWorker = async (info: any, port: MessagePort, legacy = false): Promise<void> => {
    if (disposed) throw new Error('Extension worker scope is disposed')
    // Each launch has its own identity, including across replacement runtimes.
    const id = JSON.stringify([extensionId, 'child', crypto.randomUUID()])
    children.add(id)
    const url = legacy ? ExtensionHostSubWorkerUrl.extensionHostSubWorkerUrl : info.url
    try {
      const policy = info.contentSecurityPolicy ? getContentSecurityPolicy(info.contentSecurityPolicy, url) : ''
      await RendererWorker.invokeAndTransfer(
        'LaunchIsolatedExtensionHostWorker.launchIsolatedExtensionHostWorker',
        port,
        id,
        url,
        info.name || '',
        policy,
      )
      if (disposed) throw new Error('Extension worker scope was disposed during launch')
    } catch (error) {
      children.delete(id)
      await RendererWorker.invoke('LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker', id)
      throw error
    }
  }

  const dispose = async (): Promise<void> => {
    disposed = true
    const retiring = [...children]
    children.clear()
    const results = await Promise.allSettled(
      retiring.map((id) => Promise.try(() => RendererWorker.invoke('LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker', id))),
    )
    const errors = results.filter((result) => result.status === 'rejected').map((result) => result.reason)
    if (errors.length > 0) throw new AggregateError(errors, 'Failed to dispose extension workers')
  }

  return {
    commandMap: {
      'Extensions.createWebViewWorkerRpc': (info: any, port: MessagePort) => createWorker(info, port, true),
      'Extensions.createWebViewWorkerRpc2': (info: any, port: MessagePort) => createWorker(info, port),
    },
    dispose,
  }
}
