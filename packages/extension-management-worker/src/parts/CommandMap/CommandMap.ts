/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { ExtensionsState as ExtensionState } from '../ExtensionsState/ExtensionsState.ts'
import { activateByEvent } from '../ActivateByEvent/ActivateByEvent.ts'
import { addExtension } from '../AddExtension/AddExtension.ts'
import { addWebExtension } from '../AddWebExtension/AddWebExtension.ts'
import { createWebViewWorkerRpc2 } from '../CreateWebViewRpc2/CreateWebViewRpc2.ts'
import { createWebViewWorkerRpc } from '../CreateWebViewRpc/CreateWebViewRpc.ts'
import { disableExtension2 } from '../DisableExtension2/DisableExtension2.ts'
import { disableExtension } from '../DisableExtension/DisableExtension.ts'
import { disableWorkspaceExtension } from '../DisableWorkspaceExtension/DisableWorkspaceExtension.ts'
import { disposeAllExtensionRuntimes } from '../DisposeAllExtensionRuntimes/DisposeAllExtensionRuntimes.ts'
import { disposeExtensionApplication } from '../DisposeExtensionApplication/DisposeExtensionApplication.ts'
import { enableExtension2 } from '../EnableExtension2/EnableExtension2.ts'
import { enableExtension } from '../EnableExtension/EnableExtension.ts'
import { enableWorkspaceExtension } from '../EnableWorkspaceExtension/EnableWorkspaceExtension.ts'
import { executeCommand, executeExtensionCommand } from '../ExecuteCommand/ExecuteCommand.ts'
import { executeCompletionProvider, executeResolveCompletionItemProvider } from '../ExecuteCompletionProvider/ExecuteCompletionProvider.ts'
import { executeDiagnosticProvider } from '../ExecuteDiagnosticProvider/ExecuteDiagnosticProvider.ts'
import {
  executeFileSystemProviderIsReadonly,
  executeFileSystemProviderMkdir,
  executeFileSystemProviderReadDirWithFileTypes,
  executeFileSystemProviderReadFile,
  executeFileSystemProviderRemove,
  executeFileSystemProviderRename,
  executeFileSystemProviderWriteFile,
} from '../ExecuteFileSystemProviderReadFile/ExecuteFileSystemProviderReadFile.ts'
import { executeFormattingProvider } from '../ExecuteFormattingProvider/ExecuteFormattingProvider.ts'
import { executeHoverProvider } from '../ExecuteHoverProvider/ExecuteHoverProvider.ts'
import {
  executeCodeActionProviders,
  executeLanguageProvider,
  executeOrganizeImportsProvider,
} from '../ExecuteLanguageProvider/ExecuteLanguageProvider.ts'
import { executeProvidersByEvent } from '../ExecuteProvidersByEvent/ExecuteProvidersByEvent.ts'
import { executeSignatureHelpProvider } from '../ExecuteSignatureHelpProvider/ExecuteSignatureHelpProvider.ts'
import {
  executeRequiredSourceControlProvider,
  executeSourceControlProvider,
  getEnabledSourceControlProviderIds,
} from '../ExecuteSourceControlProvider/ExecuteSourceControlProvider.ts'
import { readFile as readExtensionApiFile } from '../ExtensionApiFileSystem/ExtensionApiFileSystem.ts'
import { clearOutputChannel, getOutputChannelProviders, readOutputChannel } from '../ExtensionOutputChannel/ExtensionOutputChannel.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import * as ExtensionView from '../ExtensionView/ExtensionView.ts'
import { getAccessToken } from '../GetAccessToken/GetAccessToken.ts'
import { getAllExtensionsWithState } from '../GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import { getColorThemeCss, getColorThemeCssFromJson } from '../GetColorThemeCss/GetColorThemeCss.ts'
import { getColorThemeJson } from '../GetColorThemeJson/GetColorThemeJson.ts'
import { getColorThemeNames } from '../GetColorThemeNames/GetColorThemeNames.ts'
import { getDynamicWebExtensions } from '../GetDynamicWebExtensions/GetDynamicWebExtensions.ts'
import { getExtension } from '../GetExtension/GetExtension.ts'
import { getAllExtensions } from '../GetExtensions/GetExtensions.ts'
import { getKeyBindings } from '../GetKeyBindings/GetKeyBindings.ts'
import { getRemoteUrlForWebView } from '../GetRemoteUrlForWebView/GetRemoteUrlForWebView.ts'
import { getRpcInfo } from '../GetRpcInfo/GetRpcInfo.ts'
import { getRunningExtensions } from '../GetRunningExtensions/GetRunningExtensions.ts'
import { getRuntimeStatus } from '../GetRuntimeStatus/GetRuntimeStatus.ts'
import { getStatusBarItems } from '../GetStatusBarItems/GetStatusBarItems.ts'
import { getViews } from '../GetViews/GetViews.ts'
import { getViewsFromExtensions } from '../GetViewsFromExtensions/GetViewsFromExtensions.ts'
import { handleData } from '../HandleData/HandleData.ts'
import { handleFileChanges } from '../HandleFileChanges/HandleFileChanges.ts'
import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'
import { handleUncaughtExtensionError } from '../HandleUncaughtExtensionError/HandleUncaughtExtensionError.ts'
import { handleViewContextChange } from '../HandleViewContextChange/HandleViewContextChange.ts'
import { initialize } from '../Initialize/Initialize.ts'
import { installExtension } from '../InstallExtension/InstallExtension.ts'
import { invalidateExtensionsCache } from '../InvalidateExtensionsCache/InvalidateExtensionsCache.ts'
import { getLanguages } from '../Languages/Languages.ts'
import { handleLinkedExtensionChange } from '../LinkedExtensionHotReload/LinkedExtensionHotReload.ts'
import {
  clearNotifications,
  dismissNotification,
  getNotificationCount,
  getNotifications,
  hideNotificationsFromExtension,
  createNotification,
} from '../Notifications/Notifications.ts'
import { getPreference, setPreference } from '../Preferences/Preferences.ts'
import * as ApplicationRendererWorker from '../Rpc/Rpc.ts'
import { sendMessagePortToElectron } from '../SendMessagePortToElectron/SendMessagePortToElectron.ts'
import { sendMessagePortToFileSystemWorker } from '../SendMessagePortToFileSystemWorker/SendMessagePortToFileSystemWorker.ts'
import { showQuickInput } from '../ShowQuickInput/ShowQuickInput.ts'
import { showQuickPick } from '../ShowQuickPick/ShowQuickPick.ts'
import * as StatusBarHandleChange from '../StatusBarHandleChange/StatusBarHandleChange.ts'
import { uninstallExtension } from '../UninstallExtension/UninstallExtension.ts'
import * as WebRtc from '../WebRtc/WebRtc.ts'

const wrapCommand = (command: (extensionsState: ExtensionState, ...args: readonly any[]) => any) => {
  const wrapped = (...args: readonly any[]): any => {
    return command(ExtensionsState.get(), ...args)
  }
  return Object.assign(wrapped, { withState: command })
}

const wrapSourceControlProviderCommand = (methodName: string): ((providerId: string, ...args: readonly unknown[]) => Promise<unknown>) => {
  return wrapCommand((extensionsState, providerId: string, ...args: readonly unknown[]) => {
    return executeRequiredSourceControlProvider(extensionsState, providerId, methodName, ...args)
  })
}

type ScopedCommand = ((...args: readonly any[]) => any) & {
  readonly withState?: (state: ExtensionState, ...args: readonly any[]) => any
}

const sharedApplicationCommands = new Set([
  'Extensions.getColorThemeCss',
  'Extensions.getColorThemeCssFromJson',
  'Extensions.getColorThemeJson',
  'Extensions.getColorThemeNames',
  'Extensions.getPreference',
  'Extensions.setPreference',
])

const invokeForApplication = async (applicationId: string, method: string, ...args: readonly any[]): Promise<any> => {
  const application = ExtensionsState.get(applicationId)
  const command: ScopedCommand | undefined = commandMap[method]
  if (command?.withState) {
    return command.withState(application, ...args)
  }
  if (command && sharedApplicationCommands.has(method)) {
    return command(...args)
  }
  switch (method) {
    case 'ExtensionApi.readFile':
      return ApplicationRendererWorker.invoke('Application.execute', applicationId, 'FileSystem.readFile', ...args)
    case 'Extensions.activateByEvent':
      return activateByEvent(args[0], args[1], args[2] ?? application.platform, application)
    case 'Extensions.getAllExtensions':
      return getAllExtensionsWithState(application, args[0] || '', args[1] ?? application.platform)
    case 'Extensions.getDynamicWebExtensions':
      return application.webExtensions
    case 'Extensions.getRuntimeStatus':
      return ExtensionsState.getRuntimeStatus(args[0], applicationId)
    case 'Extensions.getStatusBarItems':
      return getStatusBarItems(applicationId)
    case 'Extensions.getViews': {
      const extensions = await getAllExtensionsWithState(application, args[0] || '', args[1] ?? application.platform)
      return getViewsFromExtensions(extensions, args[0] || '', args[1] ?? application.platform)
    }
    case 'Extensions.handleFileChanges':
      return handleFileChanges(args[0], applicationId)
    default:
      throw new Error(`Extension command does not support application context: ${method}`)
  }
}

export const commandMap: Record<string, ScopedCommand> = {
  'ExtensionApi.readFile': readExtensionApiFile,
  'ExtensionHost.sourceControlGetChangedFiles': wrapSourceControlProviderCommand('executeSourceControlGetChangedFiles'),
  'ExtensionHostQuickPick.showQuickInput': showQuickInput,
  'ExtensionHostQuickPick.showQuickPick': showQuickPick,
  'ExtensionHostSourceControl.acceptInput': wrapSourceControlProviderCommand('executeSourceControlAcceptInput'),
  'ExtensionHostSourceControl.add': wrapSourceControlProviderCommand('executeSourceControlAdd'),
  'ExtensionHostSourceControl.discard': wrapSourceControlProviderCommand('executeSourceControlDiscard'),
  'ExtensionHostSourceControl.generateCommitMessage': wrapSourceControlProviderCommand('executeSourceControlGenerateCommitMessage'),
  'ExtensionHostSourceControl.getBadgeCount': wrapSourceControlProviderCommand('executeSourceControlGetBadgeCount'),
  'ExtensionHostSourceControl.getChangedFiles': wrapSourceControlProviderCommand('executeSourceControlGetChangedFiles'),
  'ExtensionHostSourceControl.getEnabledProviderIds': wrapCommand(getEnabledSourceControlProviderIds),
  'ExtensionHostSourceControl.getFeatures': wrapSourceControlProviderCommand('executeSourceControlGetFeatures'),
  'ExtensionHostSourceControl.getFileBefore': wrapSourceControlProviderCommand('executeSourceControlGetFileBefore'),
  'ExtensionHostSourceControl.getFileDecorations': wrapSourceControlProviderCommand('executeSourceControlGetFileDecorations'),
  'ExtensionHostSourceControl.getGroups': wrapSourceControlProviderCommand('executeSourceControlGetGroups'),
  'ExtensionHostSourceControl.getIconDefinitions': async (): Promise<readonly string[]> => [],
  'Extensions.activateByEvent': activateByEvent,
  'Extensions.addExtension': addExtension,
  'Extensions.addWebExtension': addWebExtension,
  'Extensions.clearNotifications': clearNotifications,
  'Extensions.clearOutputChannel': wrapCommand(clearOutputChannel),
  'Extensions.createApplication': ExtensionsState.createApplication,
  'Extensions.createViewInstance': ExtensionView.createViewInstance,
  'Extensions.createWebViewWorkerRpc': createWebViewWorkerRpc,
  'Extensions.createWebViewWorkerRpc2': createWebViewWorkerRpc2,
  'Extensions.disable': disableExtension,
  'Extensions.disable2': disableExtension2,
  'Extensions.disableWorkspace': disableWorkspaceExtension,
  'Extensions.dismissNotification': dismissNotification,
  'Extensions.dispatchViewEvent': ExtensionView.dispatchViewEvent,
  'Extensions.disposeAllRuntimes': disposeAllExtensionRuntimes,
  'Extensions.disposeApplication': disposeExtensionApplication,
  'Extensions.disposeViewInstance': ExtensionView.disposeViewInstance,
  'Extensions.enable': enableExtension,
  'Extensions.enable2': enableExtension2,
  'Extensions.enableWorkspace': enableWorkspaceExtension,
  'Extensions.executeCodeActionProviders': wrapCommand(executeCodeActionProviders),
  'Extensions.executeCommand': wrapCommand(executeCommand),
  'Extensions.executeCompletionProvider': wrapCommand(executeCompletionProvider),
  'Extensions.executeDiagnosticProvider': wrapCommand(executeDiagnosticProvider),
  'Extensions.executeExtensionCommand': wrapCommand(executeExtensionCommand),
  'Extensions.executeFileSystemProviderIsReadonly': wrapCommand(executeFileSystemProviderIsReadonly),
  'Extensions.executeFileSystemProviderMkdir': wrapCommand(executeFileSystemProviderMkdir),
  'Extensions.executeFileSystemProviderReadDirWithFileTypes': wrapCommand(executeFileSystemProviderReadDirWithFileTypes),
  'Extensions.executeFileSystemProviderReadFile': wrapCommand(executeFileSystemProviderReadFile),
  'Extensions.executeFileSystemProviderRemove': wrapCommand(executeFileSystemProviderRemove),
  'Extensions.executeFileSystemProviderRename': wrapCommand(executeFileSystemProviderRename),
  'Extensions.executeFileSystemProviderWriteFile': wrapCommand(executeFileSystemProviderWriteFile),
  'Extensions.executeFormattingProvider': wrapCommand(executeFormattingProvider),
  'Extensions.executeHoverProvider': wrapCommand(executeHoverProvider),
  'Extensions.executeLanguageProvider': wrapCommand(executeLanguageProvider),
  'Extensions.executeOrganizeImportsProvider': wrapCommand(executeOrganizeImportsProvider),
  'Extensions.executeProvidersByEvent': wrapCommand(executeProvidersByEvent),
  'Extensions.executeResolveCompletionItemProvider': wrapCommand(executeResolveCompletionItemProvider),
  'Extensions.executeSignatureHelpProvider': wrapCommand(executeSignatureHelpProvider),
  'Extensions.executeSourceControlProvider': wrapCommand(executeSourceControlProvider),
  'Extensions.getAccessToken': getAccessToken,
  'Extensions.getAllExtensions': getAllExtensions,
  'Extensions.getColorThemeCss': getColorThemeCss,
  'Extensions.getColorThemeCssFromJson': getColorThemeCssFromJson,
  'Extensions.getColorThemeJson': getColorThemeJson,
  'Extensions.getColorThemeNames': getColorThemeNames,
  'Extensions.getDynamicWebExtensions': getDynamicWebExtensions,
  'Extensions.getEnabledSourceControlProviderIds': wrapCommand(getEnabledSourceControlProviderIds),
  'Extensions.getExtension': getExtension,
  'Extensions.getKeyBindings': getKeyBindings,
  'Extensions.getLanguages': getLanguages,
  'Extensions.getNotificationCount': getNotificationCount,
  'Extensions.getNotifications': getNotifications,
  'Extensions.getOutputChannelProviders': wrapCommand(getOutputChannelProviders),
  'Extensions.getPreference': getPreference,
  'Extensions.getRemoteUrlForWebView': getRemoteUrlForWebView,
  'Extensions.getRpcInfo': getRpcInfo,
  'Extensions.getRunningExtensions': getRunningExtensions,
  'Extensions.getRuntimeStatus': getRuntimeStatus,
  'Extensions.getStatusBarItems': getStatusBarItems,
  'Extensions.getViewActions': ExtensionView.getViewActions,
  'Extensions.getViewActionsDom': ExtensionView.getViewActionsDom,
  'Extensions.getViewInstanceState': ExtensionView.getViewInstanceState,
  'Extensions.getViewMenuEntries': ExtensionView.getViewMenuEntries,
  'Extensions.getViews': getViews,
  'Extensions.handleData': handleData,
  'Extensions.handleFileChanges': handleFileChanges,
  'Extensions.handleLinkedExtensionChange': handleLinkedExtensionChange,
  'Extensions.handleMessagePort': handleMessagePort,
  'Extensions.handleUncaughtExtensionError': handleUncaughtExtensionError,
  'Extensions.handleViewContextChange': handleViewContextChange,
  'Extensions.hideNotificationsFromExtension': hideNotificationsFromExtension,
  'Extensions.initialize': initialize,
  'Extensions.install': installExtension,
  'Extensions.invalidateExtensionsCache': invalidateExtensionsCache,
  'Extensions.invokeForApplication': invokeForApplication,
  'Extensions.readOutputChannel': wrapCommand(readOutputChannel),
  'Extensions.renderViewInstance': ExtensionView.renderViewInstance,
  'Extensions.requestViewRerender': ExtensionView.requestViewRerender,
  'Extensions.saveViewInstanceState': ExtensionView.saveViewInstanceState,
  'Extensions.sendMessagePortToElectron': sendMessagePortToElectron,
  'Extensions.sendMessagePortToFileSystemWorker': sendMessagePortToFileSystemWorker,
  'Extensions.setPreference': setPreference,
  'Extensions.setViewInstanceActive': ExtensionView.setViewInstanceActive,
  'Extensions.setViewInstanceState': ExtensionView.setViewInstanceState,
  'Extensions.showNotification': (type: string, message: string): Promise<void> => createNotification('unknown.extension', type, message),
  'Extensions.showViewContextMenu': ExtensionView.showViewContextMenu,
  'Extensions.uninstall': uninstallExtension,
  'StatusBar.handleChange': StatusBarHandleChange.handleChange,
  'WebRtc.readMicLevels': WebRtc.readMicLevels,
  'WebRtc.setRemoteDescription': WebRtc.setRemoteDescription,
  'WebRtc.startWebRtcAudioStream': WebRtc.startWebRtcAudioStream,
  'WebRtc.stopWebRtcAudioStream': WebRtc.stopWebRtcAudioStream,
}
