/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import * as IframeWorkerState from '../IframeWorkerState/IframeWorkerState.ts'

export const createWebView3 = async ({
  assetDir,
  id,
  isGitpod,
  platform,
  uri,
  useNewWebViewHandler,
  webViewScheme,
}: {
  id: number
  uri: string
  isGitpod: boolean
  platform: number
  assetDir: string
  webViewScheme: string
  useNewWebViewHandler: boolean
}): Promise<void> => {
  const rpc = IframeWorkerState.get()
  await rpc.invoke('WebView.create3', {
    assetDir,
    id,
    isGitpod,
    platform,
    uri,
    useNewWebViewHandler,
    webViewScheme,
  })
}
