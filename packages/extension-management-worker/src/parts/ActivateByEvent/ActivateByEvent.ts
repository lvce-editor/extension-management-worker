import { activateExtension3 } from '../ActivateExtension3/ActivateExtension3.ts'
import { getExtensionAbsolutePath } from '../GetExtensionAbsolutePath/GetExtensionAbsolutePath.ts'
import { getAllExtensions } from '../GetExtensions/GetExtensions.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'

export interface ActivateByEventResult {
  readonly hasActivatedExtensions: boolean
  readonly error: Error | undefined
}

const activatingExtensions: Record<string, Promise<void>> = Object.create(null)
const runningExtensions: Record<string, boolean> = Object.create(null)

const matchesEvent = (extension: any, event: string): boolean => {
  return IsExtensionIsolated.isExtensionIsolated(extension) && Array.isArray(extension.activation) && extension.activation.includes(event)
}

const getExtensionId = (extension: any): string => {
  return extension.id
}

const getAbsolutePath = (extension: any, assetDir: string, platform: number): string => {
  return getExtensionAbsolutePath(
    extension.id,
    extension.isWeb,
    extension.builtin,
    extension.path || extension.uri,
    extension.browser,
    globalThis.location.origin,
    platform,
    assetDir,
  )
}

const doActivateExtension = async (extension: any, absolutePath: string, event: string, platform: number): Promise<void> => {
  const extensionId = getExtensionId(extension)
  try {
    await activateExtension3(extension, absolutePath, event, platform)
    runningExtensions[extensionId] = true
  } finally {
    delete activatingExtensions[extensionId]
  }
}

const activateExtension = async (extension: any, event: string, assetDir: string, platform: number): Promise<void> => {
  const extensionId = getExtensionId(extension)
  if (runningExtensions[extensionId]) {
    return
  }
  if (!Object.hasOwn(activatingExtensions, extensionId)) {
    const absolutePath = getAbsolutePath(extension, assetDir, platform)
    activatingExtensions[extensionId] = doActivateExtension(extension, absolutePath, event, platform)
  }
  await activatingExtensions[extensionId]
}

export const activateByEvent = async (event: string, assetDir: string, platform: number): Promise<ActivateByEventResult> => {
  try {
    if (event === 'none') {
      await Promise.all(Object.values(activatingExtensions))
      return {
        hasActivatedExtensions: Object.keys(activatingExtensions).length > 0,
        error: undefined,
      }
    }
    const extensions = await getAllExtensions(assetDir, platform)
    const matchingExtensions = extensions.filter((extension) => matchesEvent(extension, event))
    for (const extension of matchingExtensions) {
      await activateExtension(extension, event, assetDir, platform)
    }
    return {
      hasActivatedExtensions: matchingExtensions.length > 0,
      error: undefined,
    }
  } catch (error) {
    return {
      hasActivatedExtensions: false,
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }
}
