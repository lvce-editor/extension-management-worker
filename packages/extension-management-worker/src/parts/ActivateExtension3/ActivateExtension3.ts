import { activateExtension2 } from '../ActivateExtension2/ActivateExtension2.ts'
import * as HandleRpcInfos from '../HandleRpcInfos/HandleRpcInfos.ts'
import { importExtension } from '../ImportExtension/ImportExtension.ts'
import { interExtensionId } from '../InferExtensionId/InferExtensionId.ts'

export const activateExtension3 = async (extension: any, absolutePath: string, activationEvent: string, platform: number) => {
  HandleRpcInfos.handleRpcInfos(extension, platform)
  const extensionId = extension.id || interExtensionId(extension.uri)
  await importExtension(extensionId, absolutePath, activationEvent)
  await activateExtension2(extensionId, extension, absolutePath)
}
