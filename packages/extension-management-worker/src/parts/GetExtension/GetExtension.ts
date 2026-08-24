import * as ExtensionEnablementState from '../ExtensionEnablementState/ExtensionEnablementState.ts'
import * as GetExtensions from '../GetExtensions/GetExtensions.ts'
import * as WorkspaceExtensionEnablementStorage from '../WorkspaceExtensionEnablementStorage/WorkspaceExtensionEnablementStorage.ts'

const getEnablementState = (
  id: string,
  disabled: boolean,
  workspaceDisabledIds: readonly string[],
  workspaceEnabledIds: readonly string[],
): ExtensionEnablementState.ExtensionEnablementState => {
  if (workspaceEnabledIds.includes(id)) {
    return ExtensionEnablementState.EnabledWorkspace
  }
  if (workspaceDisabledIds.includes(id)) {
    return ExtensionEnablementState.DisabledWorkspace
  }
  return disabled ? ExtensionEnablementState.DisabledGlobally : ExtensionEnablementState.EnabledGlobally
}

export const getExtension = async (id: string, assetDir: string, platform: number): Promise<any> => {
  const allExtensions = await GetExtensions.getAllExtensions(assetDir, platform)
  for (const extension of allExtensions) {
    if (extension.id === id) {
      const { disabledIds, enabledIds, hasWorkspace } = await WorkspaceExtensionEnablementStorage.getWorkspaceExtensionEnablementSafe()
      if (!hasWorkspace) {
        return extension
      }
      return {
        ...extension,
        enablementState: getEnablementState(id, extension.disabled === true, disabledIds, enabledIds),
        hasWorkspace,
      }
    }
  }
  return undefined
}
