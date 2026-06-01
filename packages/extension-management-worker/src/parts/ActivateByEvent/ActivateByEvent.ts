import { activateExtension3 } from '../ActivateExtension3/ActivateExtension3.ts'
import { getExtensionAbsolutePath } from '../GetExtensionAbsolutePath/GetExtensionAbsolutePath.ts'
import { getAllExtensions } from '../GetExtensions/GetExtensions.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'

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
    extension.uri || extension.path,
    extension.browser,
    globalThis.location.origin,
    platform,
    assetDir,
  )
}

const activateExtension = async (extension: any, event: string, assetDir: string, platform: number): Promise<void> => {
  const extensionId = getExtensionId(extension)
  if (runningExtensions[extensionId]) {
    return
  }
  if (!Object.hasOwn(activatingExtensions, extensionId)) {
    const absolutePath = getAbsolutePath(extension, assetDir, platform)
    activatingExtensions[extensionId] = activateExtension3(extension, absolutePath, event, platform)
      .then(() => {
        runningExtensions[extensionId] = true
      })
      .finally(() => {
        delete activatingExtensions[extensionId]
      })
  }
  await activatingExtensions[extensionId]
}

export const activateByEvent = async (event: string, assetDir: string, platform: number): Promise<void> => {
  if (event === 'none') {
    await Promise.all(Object.values(activatingExtensions))
    return
  }
  const extensions = await getAllExtensions(assetDir, platform)
  const matchingExtensions = extensions.filter((extension) => matchesEvent(extension, event))
  for (const extension of matchingExtensions) {
    await activateExtension(extension, event, assetDir, platform)
  }
}
