import { activateExtension2 } from '../ActivateExtension2/ActivateExtension2.ts'
import { importExtension } from '../ImportExtension/ImportExtension.ts'

export const activateExtension3 = async (extension: any, absolutePath: string, activationEvent: string) => {
  const extensionId = extension.id
  await importExtension(extensionId, absolutePath, activationEvent)
  await activateExtension2(extensionId, extension, absolutePath)
}
