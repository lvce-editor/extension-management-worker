import { activateIsolatedExtension } from '../ActivateIsolatedExtension/ActivateIsolatedExtension.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import { getContentSecurityPolicy } from '../GetContentSecurityPolicy/GetContentSecurityPolicy.ts'
import * as HandleRpcInfos from '../HandleRpcInfos/HandleRpcInfos.ts'
import { interExtensionId } from '../InferExtensionId/InferExtensionId.ts'
import * as IsExtensionIsolated from '../IsExtensionIsolated/IsExtensionIsolated.ts'

export const activateExtension3 = async (extension: any, absolutePath: string, activationEvent: string, platform: number) => {
  if (extension.applicationId !== undefined) {
    ExtensionsState.assertCurrentApplication(extension)
  }
  const extensionId = extension.id || interExtensionId(extension.uri)
  if (!IsExtensionIsolated.isExtensionIsolated(extension)) {
    throw new Error(`Extension ${extensionId} does not use the isolated extension API`)
  }
  HandleRpcInfos.handleRpcInfos(extension, platform)
  const contentSecurityPolicy = getContentSecurityPolicy(extension.contentSecurityPolicy, absolutePath, extension.rpc)
  if (extension.applicationId === undefined) {
    await activateIsolatedExtension(extensionId, absolutePath, extension.workerName || '', contentSecurityPolicy, activationEvent)
  } else {
    await activateIsolatedExtension(
      extensionId,
      absolutePath,
      extension.workerName || '',
      contentSecurityPolicy,
      activationEvent,
      undefined,
      extension.applicationId,
    )
  }
}
