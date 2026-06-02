import { activateByEvent } from '../ActivateByEvent/ActivateByEvent.ts'
import { activateExtension2 } from '../ActivateExtension2/ActivateExtension2.ts'
import { activateExtension3 } from '../ActivateExtension3/ActivateExtension3.ts'
import { addWebExtension } from '../AddWebExtension/AddWebExtension.ts'
import { createWebViewWorkerRpc2 } from '../CreateWebViewRpc2/CreateWebViewRpc2.ts'
import { createWebViewWorkerRpc } from '../CreateWebViewRpc/CreateWebViewRpc.ts'
import { disableExtension2 } from '../DisableExtension2/DisableExtension2.ts'
import { disableExtension } from '../DisableExtension/DisableExtension.ts'
import { enableExtension2 } from '../EnableExtension2/EnableExtension2.ts'
import { enableExtension } from '../EnableExtension/EnableExtension.ts'
import { executeCommand } from '../ExecuteCommand/ExecuteCommand.ts'
import { executeCompletionProvider, executeResolveCompletionItemProvider } from '../ExecuteCompletionProvider/ExecuteCompletionProvider.ts'
import { executeFormattingProvider } from '../ExecuteFormattingProvider/ExecuteFormattingProvider.ts'
import { executeHoverProvider } from '../ExecuteHoverProvider/ExecuteHoverProvider.ts'
import { getColorThemeCss, getColorThemeCssFromJson } from '../GetColorThemeCss/GetColorThemeCss.ts'
import { getColorThemeJson } from '../GetColorThemeJson/GetColorThemeJson.ts'
import { getColorThemeNames } from '../GetColorThemeNames/GetColorThemeNames.ts'
import { getDynamicWebExtensions } from '../GetDynamicWebExtensions/GetDynamicWebExtensions.ts'
import { getExtension } from '../GetExtension/GetExtension.ts'
import { getAllExtensions } from '../GetExtensions/GetExtensions.ts'
import { getRemoteUrlForWebView } from '../GetRemoteUrlForWebView/GetRemoteUrlForWebView.ts'
import { getRpcInfo } from '../GetRpcInfo/GetRpcInfo.ts'
import { getRuntimeStatus } from '../GetRuntimeStatus/GetRuntimeStatus.ts'
import { getStatusBarItems } from '../GetStatusBarItems/GetStatusBarItems.ts'
import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'
import { importExtension } from '../ImportExtension/ImportExtension.ts'
import { initialize } from '../Initialize/Initialize.ts'
import { installExtension } from '../InstallExtension/InstallExtension.ts'
import { invalidateExtensionsCache } from '../InvalidateExtensionsCache/InvalidateExtensionsCache.ts'
import { getLanguages } from '../Languages/Languages.ts'
import * as StatusBarHandleChange from '../StatusBarHandleChange/StatusBarHandleChange.ts'
import { uninstallExtension } from '../UninstallExtension/UninstallExtension.ts'

export const commandMap: Record<string, (...args: readonly any[]) => any> = {
  'Extensions.activate2': activateExtension2,
  'Extensions.activate3': activateExtension3,
  'Extensions.activateByEvent': activateByEvent,
  'Extensions.addWebExtension': addWebExtension,
  'Extensions.createWebViewWorkerRpc': createWebViewWorkerRpc,
  'Extensions.createWebViewWorkerRpc2': createWebViewWorkerRpc2,
  'Extensions.disable': disableExtension,
  'Extensions.disable2': disableExtension2,
  'Extensions.enable': enableExtension,
  'Extensions.enable2': enableExtension2,
  'Extensions.executeCommand': executeCommand,
  'Extensions.executeCompletionProvider': executeCompletionProvider,
  'Extensions.executeFormattingProvider': executeFormattingProvider,
  'Extensions.executeHoverProvider': executeHoverProvider,
  'Extensions.executeResolveCompletionItemProvider': executeResolveCompletionItemProvider,
  'Extensions.getAllExtensions': getAllExtensions,
  'Extensions.getColorThemeCss': getColorThemeCss,
  'Extensions.getColorThemeCssFromJson': getColorThemeCssFromJson,
  'Extensions.getColorThemeJson': getColorThemeJson,
  'Extensions.getColorThemeNames': getColorThemeNames,
  'Extensions.getDynamicWebExtensions': getDynamicWebExtensions,
  'Extensions.getExtension': getExtension,
  'Extensions.getLanguages': getLanguages,
  'Extensions.getRemoteUrlForWebView': getRemoteUrlForWebView,
  'Extensions.getRpcInfo': getRpcInfo,
  'Extensions.getRuntimeStatus': getRuntimeStatus,
  'Extensions.getStatusBarItems': getStatusBarItems,
  'Extensions.handleMessagePort': handleMessagePort,
  'Extensions.importExtension': importExtension,
  'Extensions.initialize': initialize,
  'Extensions.install': installExtension,
  'Extensions.invalidateExtensionsCache': invalidateExtensionsCache,
  'Extensions.uninstall': uninstallExtension,
  'StatusBar.handleChange': StatusBarHandleChange.handleChange,
}
