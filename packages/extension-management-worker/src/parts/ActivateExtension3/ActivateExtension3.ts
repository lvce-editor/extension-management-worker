import { activateExtension2 } from '../ActivateExtension2/ActivateExtension2.ts'
import { activateIsolatedExtension } from '../ActivateIsolatedExtension/ActivateIsolatedExtension.ts'
import { getContentSecurityPolicy } from '../GetContentSecurityPolicy/GetContentSecurityPolicy.ts'
import * as HandleRpcInfos from '../HandleRpcInfos/HandleRpcInfos.ts'
import { importExtension } from '../ImportExtension/ImportExtension.ts'
import { interExtensionId } from '../InferExtensionId/InferExtensionId.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'

export const activateExtension3 = async (extension: any, absolutePath: string, activationEvent: string, platform: number) => {
  HandleRpcInfos.handleRpcInfos(extension, platform)
  const extensionId = extension.id || interExtensionId(extension.uri)
  if (IsExtensionIsolated.isExtensionIsolated(extension)) {
    const contentSecurityPolicy = getContentSecurityPolicy(extension.contentSecurityPolicy)
    await activateIsolatedExtension(extensionId, absolutePath, extension.workerName || '', contentSecurityPolicy, activationEvent)
    return
  }
  await importExtension(extensionId, absolutePath, activationEvent)
  await activateExtension2(extensionId, extension, absolutePath)
}
