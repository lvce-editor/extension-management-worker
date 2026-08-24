import { getAllExtensions } from '../GetExtensions/GetExtensions.ts'
import { getRuntimeContext } from '../GetRuntimeContext/GetRuntimeContext.ts'
import { restartLinkedExtension } from '../RestartLinkedExtension/RestartLinkedExtension.ts'

interface LinkedExtensionDevelopmentConfig {
  readonly path: string
  readonly uri: string
}

interface FileWatcherEvent {
  readonly uri?: string
}

interface Dependencies {
  readonly getAllExtensions: typeof getAllExtensions
  readonly getRuntimeContext: typeof getRuntimeContext
  readonly restartLinkedExtension: typeof restartLinkedExtension
}

const defaultDependencies: Dependencies = {
  getAllExtensions,
  getRuntimeContext,
  restartLinkedExtension,
}

const ReloadDelay = 2000
const extensionRoots: LinkedExtensionDevelopmentConfig[] = []
const reloadTimeouts = new Map<string, ReturnType<typeof setTimeout>>()
const reloadQueues = new Map<string, Promise<void>>()
const state = {
  dependencies: defaultDependencies,
}

const normalizeRootUri = (uri: string): string => {
  return uri.endsWith('/') ? uri : `${uri}/`
}

const findExtensionRoot = (uri: string): LinkedExtensionDevelopmentConfig | undefined => {
  return extensionRoots.find((extension) => uri === extension.uri || uri.startsWith(normalizeRootUri(extension.uri)))
}

const reload = async (path: string): Promise<void> => {
  const { assetDir, platform } = await state.dependencies.getRuntimeContext('', 0)
  const extensions = await state.dependencies.getAllExtensions(assetDir, platform)
  const extension = extensions.find((candidate) => candidate.linked === true && candidate.symlink === path)
  if (!extension) {
    return
  }
  await state.dependencies.restartLinkedExtension(extension, assetDir, platform)
}

const runReload = async (path: string, previous: Readonly<Promise<void>>): Promise<void> => {
  try {
    await previous
  } catch {
    // Continue with the latest rebuild after an earlier reload failed.
  }
  await reload(path)
}

const reportReloadResult = async (path: string, current: Readonly<Promise<void>>): Promise<void> => {
  try {
    await current
  } catch (error) {
    console.error(`[extension-hot-reload] ${error}`)
  } finally {
    if (reloadQueues.get(path) === current) {
      reloadQueues.delete(path)
    }
  }
}

const queueReload = (path: string): void => {
  const previous = reloadQueues.get(path) || Promise.resolve()
  const current = runReload(path, previous)
  reloadQueues.set(path, current)
  void reportReloadResult(path, current)
}

export const configure = (extensions: readonly LinkedExtensionDevelopmentConfig[], newDependencies: Dependencies = defaultDependencies): void => {
  extensionRoots.splice(0, extensionRoots.length, ...extensions)
  state.dependencies = newDependencies
}

export const handleLinkedExtensionChange = (event: FileWatcherEvent): void => {
  if (typeof event.uri !== 'string') {
    return
  }
  const extension = findExtensionRoot(event.uri)
  if (!extension) {
    return
  }
  const oldTimeout = reloadTimeouts.get(extension.path)
  if (oldTimeout !== undefined) {
    clearTimeout(oldTimeout)
  }
  reloadTimeouts.set(
    extension.path,
    setTimeout(() => {
      reloadTimeouts.delete(extension.path)
      queueReload(extension.path)
    }, ReloadDelay),
  )
}

export const reset = (): void => {
  extensionRoots.length = 0
  for (const timeout of reloadTimeouts.values()) {
    clearTimeout(timeout)
  }
  reloadTimeouts.clear()
  reloadQueues.clear()
  state.dependencies = defaultDependencies
}
