/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { IframeWorker } from '@lvce-editor/rpc-registry'

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
  await IframeWorker.invoke('WebView.create3', {
    assetDir,
    id,
    isGitpod,
    platform,
    uri,
    useNewWebViewHandler,
    webViewScheme,
  })
}
