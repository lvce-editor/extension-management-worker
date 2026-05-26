import { RendererWorker } from '@lvce-editor/rpc-registry'
import * as GetRemoteUrlForWebView from '../GetRemoteUrlForWebView/GetRemoteUrlForWebView.ts'

export const iframeWorkerCommandMap = {
  'ExtensionHostManagement.activateByEvent': (...args: readonly any[]) => RendererWorker.invoke('ExtensionHostManagement.activateByEvent', ...args),
  'WebView.compatExtensionHostWorkerInvoke': (...args: readonly any[]) => RendererWorker.invoke('WebView.compatExtensionHostWorkerInvoke', ...args),
  'WebView.compatExtensionHostWorkerInvokeAndTransfer': (...args: readonly any[]) =>
    RendererWorker.invokeAndTransfer('WebView.compatExtensionHostWorkerInvokeAndTransfer', ...args),
  'WebView.compatRendererProcessInvoke': (...args: readonly any[]) => RendererWorker.invoke('WebView.compatRendererProcessInvoke', ...args),
  'WebView.compatRendererProcessInvokeAndTransfer': (...args: readonly any[]) =>
    RendererWorker.invokeAndTransfer('WebView.compatRendererProcessInvokeAndTransfer', ...args),
  // @ts-ignore
  'WebView.compatRendererWorkerInvoke': (...args: readonly any[]) => RendererWorker.invoke(...args),
  // @ts-ignore
  'WebView.compatRendererWorkerInvokeAndTransfer': (...args: readonly any[]) => RendererWorker.invokeAndTransfer(...args),
  'WebView.compatSharedProcessInvoke': (...args: readonly any[]) => RendererWorker.invoke('WebView.compatSharedProcessInvoke', ...args),
  'WebView.getRemoteUrl': (options: any) => GetRemoteUrlForWebView.getRemoteUrlForWebView(options.uri, options),
  'WebView.getSavedState': (...args: readonly any[]) => RendererWorker.invoke('WebView.getSavedState', ...args),
  'WebView.getWebViewInfo': (...args: readonly any[]) => RendererWorker.invoke('WebView.getWebViewInfo', ...args),
  'WebView.getWebViews': (...args: readonly any[]) => RendererWorker.invoke('WebView.getWebViews', ...args),
  'WebView.setPort': (...args: readonly any[]) => RendererWorker.invoke('WebView.setPort', ...args),
}
