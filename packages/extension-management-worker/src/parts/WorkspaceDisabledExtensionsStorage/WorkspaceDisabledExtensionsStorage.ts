import * as Assert from '@lvce-editor/assert'
import { FileSystemWorker, RendererWorker } from '@lvce-editor/rpc-registry'

interface DisabledExtensionsJson {
  readonly disabledExtensions?: readonly unknown[]
}

const WorkspaceConfigFolderName = '.lvce'
const DisabledExtensionsFileName = 'disabled-extensions.json'

const joinUri = (base: string, ...parts: readonly string[]): string => {
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
  return [normalizedBase, ...parts].join('/')
}

const stringifyJson = (data: unknown): string => {
  return JSON.stringify(data, null, 2) + '\n'
}

const getWorkspaceUri = async (): Promise<string> => {
  return RendererWorker.invoke('Workspace.getPath')
}

const getWorkspaceConfigDirUri = async (): Promise<string> => {
  const workspaceUri = await getWorkspaceUri()
  return joinUri(workspaceUri, WorkspaceConfigFolderName)
}

export const getWorkspaceDisabledExtensionsJsonUri = async (): Promise<string> => {
  const configDirUri = await getWorkspaceConfigDirUri()
  return joinUri(configDirUri, DisabledExtensionsFileName)
}

const parseDisabledExtensions = (content: string): readonly string[] => {
  const parsed: DisabledExtensionsJson = JSON.parse(content)
  if (!Array.isArray(parsed.disabledExtensions)) {
    return []
  }
  return parsed.disabledExtensions.filter((item): item is string => typeof item === 'string')
}

const readDisabledExtensionIdsFromUri = async (uri: string): Promise<readonly string[]> => {
  const exists = await FileSystemWorker.exists(uri)
  if (!exists) {
    return []
  }
  const content = await FileSystemWorker.readFile(uri)
  return parseDisabledExtensions(content)
}

export const readDisabledExtensionIds = async (): Promise<readonly string[]> => {
  const uri = await getWorkspaceDisabledExtensionsJsonUri()
  return readDisabledExtensionIdsFromUri(uri)
}

export const readDisabledExtensionIdsSafe = async (): Promise<readonly string[]> => {
  try {
    return await readDisabledExtensionIds()
  } catch {
    return []
  }
}

const writeDisabledExtensionIds = async (uri: string, disabledExtensions: readonly string[]): Promise<void> => {
  await FileSystemWorker.writeFile(
    uri,
    stringifyJson({
      disabledExtensions,
    }),
  )
}

export const disableExtension = async (id: string): Promise<void> => {
  Assert.string(id)
  const configDirUri = await getWorkspaceConfigDirUri()
  const uri = joinUri(configDirUri, DisabledExtensionsFileName)
  const configDirExists = await FileSystemWorker.exists(configDirUri)
  if (!configDirExists) {
    await FileSystemWorker.mkdir(configDirUri)
  }
  const oldDisabled = await readDisabledExtensionIdsFromUri(uri)
  const newDisabled = oldDisabled.includes(id) ? oldDisabled : [...oldDisabled, id]
  await writeDisabledExtensionIds(uri, newDisabled)
}

export const enableExtension = async (id: string): Promise<void> => {
  Assert.string(id)
  const uri = await getWorkspaceDisabledExtensionsJsonUri()
  const exists = await FileSystemWorker.exists(uri)
  if (!exists) {
    return
  }
  const oldDisabled = await readDisabledExtensionIdsFromUri(uri)
  const newDisabled = oldDisabled.filter((item) => item !== id)
  await writeDisabledExtensionIds(uri, newDisabled)
}
