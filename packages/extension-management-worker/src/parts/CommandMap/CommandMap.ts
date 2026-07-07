/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { ExtensionsState as ExtensionState } from '../ExtensionsState/ExtensionsState.ts'
import { activateByEvent } from '../ActivateByEvent/ActivateByEvent.ts'
import { activateExtension2 } from '../ActivateExtension2/ActivateExtension2.ts'
import { activateExtension3 } from '../ActivateExtension3/ActivateExtension3.ts'
import { addWebExtension } from '../AddWebExtension/AddWebExtension.ts'
import { createWebViewWorkerRpc2 } from '../CreateWebViewRpc2/CreateWebViewRpc2.ts'
import { createWebViewWorkerRpc } from '../CreateWebViewRpc/CreateWebViewRpc.ts'
import { disableExtension2 } from '../DisableExtension2/DisableExtension2.ts'
import { disableExtension } from '../DisableExtension/DisableExtension.ts'
import { disableWorkspaceExtension } from '../DisableWorkspaceExtension/DisableWorkspaceExtension.ts'
import { enableExtension2 } from '../EnableExtension2/EnableExtension2.ts'
import { enableExtension } from '../EnableExtension/EnableExtension.ts'
import { enableWorkspaceExtension } from '../EnableWorkspaceExtension/EnableWorkspaceExtension.ts'
import { executeCommand, executeExtensionCommand } from '../ExecuteCommand/ExecuteCommand.ts'
import { executeCompletionProvider, executeResolveCompletionItemProvider } from '../ExecuteCompletionProvider/ExecuteCompletionProvider.ts'
import { executeDiagnosticProvider } from '../ExecuteDiagnosticProvider/ExecuteDiagnosticProvider.ts'
import { executeFormattingProvider } from '../ExecuteFormattingProvider/ExecuteFormattingProvider.ts'
import { executeHoverProvider } from '../ExecuteHoverProvider/ExecuteHoverProvider.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import * as ExtensionView from '../ExtensionView/ExtensionView.ts'
import { getColorThemeCss, getColorThemeCssFromJson } from '../GetColorThemeCss/GetColorThemeCss.ts'
import { getColorThemeJson } from '../GetColorThemeJson/GetColorThemeJson.ts'
import { getColorThemeNames } from '../GetColorThemeNames/GetColorThemeNames.ts'
import { getDynamicWebExtensions } from '../GetDynamicWebExtensions/GetDynamicWebExtensions.ts'
import { getExtension } from '../GetExtension/GetExtension.ts'
import { getAllExtensions } from '../GetExtensions/GetExtensions.ts'
import { getKeyBindings } from '../GetKeyBindings/GetKeyBindings.ts'
import { getRemoteUrlForWebView } from '../GetRemoteUrlForWebView/GetRemoteUrlForWebView.ts'
import { getRpcInfo } from '../GetRpcInfo/GetRpcInfo.ts'
import { getRuntimeStatus } from '../GetRuntimeStatus/GetRuntimeStatus.ts'
import { getStatusBarItems } from '../GetStatusBarItems/GetStatusBarItems.ts'
import { getViews } from '../GetViews/GetViews.ts'
import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'
import { handleViewContextChange } from '../HandleViewContextChange/HandleViewContextChange.ts'
import { importExtension } from '../ImportExtension/ImportExtension.ts'
import { initialize } from '../Initialize/Initialize.ts'
import { installExtension } from '../InstallExtension/InstallExtension.ts'
import { invalidateExtensionsCache } from '../InvalidateExtensionsCache/InvalidateExtensionsCache.ts'
import { getLanguages } from '../Languages/Languages.ts'
import { getPreference, setPreference } from '../Preferences/Preferences.ts'
import { sendMessagePortToFileSystemWorker } from '../SendMessagePortToFileSystemWorker/SendMessagePortToFileSystemWorker.ts'
import * as StatusBarHandleChange from '../StatusBarHandleChange/StatusBarHandleChange.ts'
import { uninstallExtension } from '../UninstallExtension/UninstallExtension.ts'

const wrapCommand = (command: (extensionsState: ExtensionState, ...args: readonly any[]) => any): ((...args: readonly any[]) => any) => {
  return (...args: readonly any[]): any => {
    return command(ExtensionsState.get(), ...args)
  }
}

export const commandMap: Record<string, (...args: readonly any[]) => any> = {
  'Extensions.activate2': activateExtension2,
  'Extensions.activate3': activateExtension3,
  'Extensions.activateByEvent': activateByEvent,
  'Extensions.addWebExtension': addWebExtension,
  'Extensions.createViewInstance': ExtensionView.createViewInstance,
  'Extensions.createWebViewWorkerRpc': createWebViewWorkerRpc,
  'Extensions.createWebViewWorkerRpc2': createWebViewWorkerRpc2,
  'Extensions.disable': disableExtension,
  'Extensions.disable2': disableExtension2,
  'Extensions.disableWorkspace': disableWorkspaceExtension,
  'Extensions.dispatchViewEvent': ExtensionView.dispatchViewEvent,
  'Extensions.disposeViewInstance': ExtensionView.disposeViewInstance,
  'Extensions.enable': enableExtension,
  'Extensions.enable2': enableExtension2,
  'Extensions.enableWorkspace': enableWorkspaceExtension,
  'Extensions.executeCommand': wrapCommand(executeCommand),
  'Extensions.executeCompletionProvider': wrapCommand(executeCompletionProvider),
  'Extensions.executeDiagnosticProvider': wrapCommand(executeDiagnosticProvider),
  'Extensions.executeExtensionCommand': wrapCommand(executeExtensionCommand),
  'Extensions.executeFormattingProvider': wrapCommand(executeFormattingProvider),
  'Extensions.executeHoverProvider': wrapCommand(executeHoverProvider),
  'Extensions.executeResolveCompletionItemProvider': wrapCommand(executeResolveCompletionItemProvider),
  'Extensions.getAllExtensions': getAllExtensions,
  'Extensions.getColorThemeCss': getColorThemeCss,
  'Extensions.getColorThemeCssFromJson': getColorThemeCssFromJson,
  'Extensions.getColorThemeJson': getColorThemeJson,
  'Extensions.getColorThemeNames': getColorThemeNames,
  'Extensions.getDynamicWebExtensions': getDynamicWebExtensions,
  'Extensions.getExtension': getExtension,
  'Extensions.getKeyBindings': getKeyBindings,
  'Extensions.getLanguages': getLanguages,
  'Extensions.getPreference': getPreference,
  'Extensions.getRemoteUrlForWebView': getRemoteUrlForWebView,
  'Extensions.getRpcInfo': getRpcInfo,
  'Extensions.getRuntimeStatus': getRuntimeStatus,
  'Extensions.getStatusBarItems': getStatusBarItems,
  'Extensions.getViewMenuEntries': ExtensionView.getViewMenuEntries,
  'Extensions.getViews': getViews,
  'Extensions.handleMessagePort': handleMessagePort,
  'Extensions.handleViewContextChange': handleViewContextChange,
  'Extensions.importExtension': importExtension,
  'Extensions.initialize': initialize,
  'Extensions.install': installExtension,
  'Extensions.invalidateExtensionsCache': invalidateExtensionsCache,
  'Extensions.renderViewInstance': ExtensionView.renderViewInstance,
  'Extensions.requestViewRerender': ExtensionView.requestViewRerender,
  'Extensions.saveViewInstanceState': ExtensionView.saveViewInstanceState,
  'Extensions.sendMessagePortToFileSystemWorker': sendMessagePortToFileSystemWorker,
  'Extensions.setPreference': setPreference,
  'Extensions.showViewContextMenu': ExtensionView.showViewContextMenu,
  'Extensions.uninstall': uninstallExtension,
  'StatusBar.handleChange': StatusBarHandleChange.handleChange,
}
