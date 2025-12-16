import * as GetRemoteUrlForWebView from '../GetRemoteUrlForWebView/GetRemoteUrlForWebView.ts'
import * as Rpc from '../Rpc/Rpc.ts'

export const iframeWorkerCommandMap = {
  'ExtensionHostManagement.activateByEvent': (...args: readonly any[]) => Rpc.invoke('ExtensionHostManagement.activateByEvent', ...args),
  'WebView.compatExtensionHostWorkerInvoke': (...args: readonly any[]) => Rpc.invoke('WebView.compatExtensionHostWorkerInvoke', ...args),
  'WebView.compatExtensionHostWorkerInvokeAndTransfer': (...args: readonly any[]) =>
    Rpc.invokeAndTransfer('WebView.compatExtensionHostWorkerInvokeAndTransfer', ...args),
  'WebView.compatRendererProcessInvoke': (...args: readonly any[]) => Rpc.invoke('WebView.compatRendererProcessInvoke', ...args),
  'WebView.compatRendererProcessInvokeAndTransfer': (...args: readonly any[]) =>
    Rpc.invokeAndTransfer('WebView.compatRendererProcessInvokeAndTransfer', ...args),
  // @ts-ignore
  'WebView.compatRendererWorkerInvoke': (...args: readonly any[]) => Rpc.invoke(...args),
  // @ts-ignore
  'WebView.compatRendererWorkerInvokeAndTransfer': (...args: readonly any[]) => Rpc.invokeAndTransfer(...args),
  'WebView.compatSharedProcessInvoke': (...args: readonly any[]) => Rpc.invoke('WebView.compatSharedProcessInvoke', ...args),
  'WebView.getRemoteUrl': (options: any) => GetRemoteUrlForWebView.getRemoteUrlForWebView(options.uri, options),
  'WebView.getSavedState': (...args: readonly any[]) => Rpc.invoke('WebView.getSavedState', ...args),
  'WebView.getWebViewInfo': (...args: readonly any[]) => Rpc.invoke('WebView.getWebViewInfo', ...args),
  'WebView.getWebViews': (...args: readonly any[]) => Rpc.invoke('WebView.getWebViews', ...args),
  'WebView.setPort': (...args: readonly any[]) => Rpc.invoke('WebView.setPort', ...args),
}
