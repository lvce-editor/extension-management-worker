import { PlatformType } from '@lvce-editor/constants'
import { ModuleWorkerRpcParent } from '@lvce-editor/rpc'
import { CacheWorker, RendererWorker } from '@lvce-editor/rpc-registry'
import * as CacheStorage from '../src/parts/CacheStorage/CacheStorage.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as ExtensionStorage from '../src/parts/ExtensionStorage/ExtensionStorage.ts'
import * as WorkspaceStorage from '../src/parts/WorkspaceExtensionEnablementStorage/WorkspaceExtensionEnablementStorage.ts'

const workspace = 'memory://storage-persistence/日本語'
const globalKey = '/cache/disabledExtensions.json'

const check = (actual, expected) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

export const test = async (workerUrl) => {
  const cache = await caches.open('Extensions')
  const original = await cache.match(globalKey)
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(workspace))), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('')
  const workspaceKey = `/cache/workspaces/${hash}/extension-enablement.json`
  const oldWorkspace = await cache.match(workspaceKey)
  const renderer = RendererWorker.registerMockRpc({
    'Workspace.getPath': () => workspace,
    'WebView.compatSharedProcessInvoke': () => {
      throw new Error('Browser has no native config path')
    },
  })
  let rpc
  const reconnect = async () => {
    await rpc?.dispose()
    ExtensionsState.reset()
    WorkspaceStorage.clearCache()
    rpc = await ModuleWorkerRpcParent.create({ commandMap: {}, url: workerUrl })
    CacheWorker.set(rpc)
  }
  try {
    // Seed entries using the former direct Cache API storage format.
    await cache.put(globalKey, new Response(JSON.stringify({ disabledExtensions: ['legacy.日本語'], enabledExtensions: [] })))
    await cache.put(workspaceKey, new Response(JSON.stringify({ disabledExtensions: ['workspace.legacy'], enabledExtensions: [], workspace })))
    await reconnect()
    check(await CacheStorage.getJson(globalKey), { disabledExtensions: ['legacy.日本語'], enabledExtensions: [] })
    check((await WorkspaceStorage.getWorkspaceExtensionEnablement()).disabledIds, ['workspace.legacy'])
    await ExtensionStorage.disableExtension2('new.extension', PlatformType.Web)
    await WorkspaceStorage.disableExtension('workspace.new')
    await reconnect()
    check(await CacheStorage.getJson(globalKey), { disabledExtensions: ['legacy.日本語', 'new.extension'], enabledExtensions: [] })
    check((await WorkspaceStorage.getWorkspaceExtensionEnablement()).disabledIds, ['workspace.legacy', 'workspace.new'])
    await ExtensionStorage.enableExtension2('new.extension', PlatformType.Web)
    await WorkspaceStorage.enableExtension('workspace.new')
    await reconnect()
    check(await CacheStorage.getJson(globalKey), { disabledExtensions: ['legacy.日本語'], enabledExtensions: ['new.extension'] })
    const enablement = await WorkspaceStorage.getWorkspaceExtensionEnablement()
    check(enablement.disabledIds, ['workspace.legacy'])
    check(enablement.enabledIds, ['workspace.new'])
  } finally {
    await rpc?.dispose()
    renderer[Symbol.dispose]()
    WorkspaceStorage.clearCache()
    if (original) await cache.put(globalKey, original)
    else await cache.delete(globalKey)
    if (oldWorkspace) await cache.put(workspaceKey, oldWorkspace)
    else await cache.delete(workspaceKey)
  }
}
